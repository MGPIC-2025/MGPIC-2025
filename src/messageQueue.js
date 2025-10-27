// 消息任务队列系统
// 处理从后端global_msg发来的消息，按顺序执行动画和操作

class MessageQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.handlers = new Map();
    this.sceneContext = null; // 存储3D场景上下文
  }

  // 设置场景上下文（包含scene, models等）
  setSceneContext(context) {
    this.sceneContext = context;
  }

  // 注册消息处理器
  registerHandler(messageType, handler) {
    this.handlers.set(messageType, handler);
  }

  // 添加消息到队列
  enqueue(message) {
    // 性能优化：关闭大部分日志输出，避免控制台输出阻塞主线程
    // 只记录关键消息类型
    const criticalTypes = ['handle_on_click_copper', 'on_game_start'];
    if (criticalTypes.includes(message.type_msg)) {
      console.log("[MessageQueue] 收到消息:", message.type_msg);
    }
    this.queue.push(message);
    if (!this.isProcessing) {
      this.processNext();
    }
  }

  // 处理下一个消息
  async processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    //批量处理消息，每次处理多个消息后才让出控制权
    const batchSize = 50; // 每批处理50个消息（提高处理速度，应对大量地图块消息）
    let processed = 0;

    while (this.queue.length > 0 && processed < batchSize) {
      const message = this.queue.shift();
      processed++;

      try {
        const { type_msg, content } = message;
        const handler = this.handlers.get(type_msg);

        if (handler) {
          // 性能优化：完全关闭处理消息日志，避免阻塞主线程
          // 如需调试，可临时启用
          // console.log("[MessageQueue] 处理消息:", type_msg);
          const data = JSON.parse(content);
          
          // 对于简单的消息类型（如put_map_block），同步处理，不使用await
          // 避免大量Promise创建导致性能问题
          const result = handler(data, this.sceneContext || {});
          // 只有当handler返回Promise时才await（保持兼容性）
          if (result && typeof result.then === 'function') {
            await result;
          }
        } else {
          console.warn("[MessageQueue] 未找到处理器:", type_msg);
          console.log(
            "[MessageQueue] 当前已注册的处理器:",
            Array.from(this.handlers.keys())
          );
        }
      } catch (error) {
        console.error("[MessageQueue] 处理消息失败:", error);
        console.error("[MessageQueue] 错误详情:", error.message);
      }
    }

    // 使用 requestAnimationFrame 让出控制权
    // 比 setTimeout 更高效，会在下一帧渲染前执行
    // 如果没有更多消息，不再调度
    if (this.queue.length > 0) {
      requestAnimationFrame(() => this.processNext());
    } else {
      this.isProcessing = false;
    }
  }
}

// 创建全局单例
export const messageQueue = new MessageQueue();

// 辅助函数：根据ID查找模型
function findModelById(models, id) {
  return models.find((m) => m.id === id);
}

// 辅助函数：创建延迟Promise
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 注册所有消息处理器
export function registerAllHandlers() {
  console.log("[MessageQueue] 开始注册消息处理器...");

  // handle_on_click_copper: 当铜偶被点击时，后端返回铜偶信息
  messageQueue.registerHandler(
    "handle_on_click_copper",
    async (data, context) => {
      const { copper, resources, has_attack_targets } = data;
      console.log(
        `[Handler] 点击铜偶: ${
          copper.copper.copper_info?.name || "Unknown"
        } (ID=${copper.id})`
      );
      console.log(
        `[Handler] 铜偶状态: HP=${copper.now_health}/${copper.copper.attribute.health}, 可移动=${copper.can_move}, 可攻击=${copper.can_attack}, 有攻击目标=${has_attack_targets}`
      );

      // 高亮选中的铜偶
      if (context.highlightSelectedCopper) {
        context.highlightSelectedCopper(copper.id);
      }

      // 显示铜偶信息面板
      if (context.onShowCopperInfo) {
        context.onShowCopperInfo(copper, resources, has_attack_targets);
      }
    }
  );

  // set_copper: 在指定地点放置铜偶
  messageQueue.registerHandler("set_copper", async (data, context) => {
    const { id, position, copper } = data;
    console.log(`[Handler] set_copper at ${position}, id=${id}`);
    console.log(`[Handler] 实际铜偶ID: copper.id=${copper.id}`);

    // 通知外部记录实际的铜偶ID
    if (window.__ACTUAL_COPPER_IDS__) {
      window.__ACTUAL_COPPER_IDS__.push(copper.id);
      console.log(
        `[Handler] 已添加铜偶ID到数组，当前数量: ${window.__ACTUAL_COPPER_IDS__.length}`
      );
    } else {
      console.error("[Handler] window.__ACTUAL_COPPER_IDS__ 未初始化！");
    }

    // TODO: 根据copper数据加载3D模型
    // 这里需要和model.js的loadModel配合
    if (context.onSetCopper) {
      context.onSetCopper(id, position, copper);
    }
  });

  // set_enemy: 在指定地点放置敌人
  messageQueue.registerHandler("set_enemy", async (data, context) => {
    const { id, position, enemy } = data;
    console.log(`[Handler] set_enemy at ${position}, id=${id}`);

    if (context.onSetEnemy) {
      context.onSetEnemy(id, position, enemy);
    }
  });

  // remove_unit: 删除单位（带消失动画）
  messageQueue.registerHandler("remove_unit", async (data, context) => {
    const { id } = data;
    console.log(`[Handler] remove_unit id=${id}`);

    const model = findModelById(context.models || [], id);
    if (model && model.object) {
      // 淡出动画
      const duration = 500;
      const startTime = performance.now();

      await new Promise((resolve) => {
        function animate() {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          if (model.object) {
            model.object.traverse((child) => {
              if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 1 - progress;
              }
            });
          }

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        }
        animate();
      });

      // 从场景移除
      if (context.scene) {
        context.scene.remove(model.object);
      }

      // 从models数组移除
      if (context.models) {
        const index = context.models.indexOf(model);
        if (index > -1) {
          context.models.splice(index, 1);
        }
      }
    }
  });

  // change_direction: 改变单位朝向
  messageQueue.registerHandler("change_direction", async (data, context) => {
    const { id, direction } = data;
    console.log(`[Handler] change_direction id=${id}, direction=${direction}`);

    const model = findModelById(context.models || [], id);
    if (model && model.object) {
      let targetRotation = 0;
      switch (direction) {
        case "PositiveX":
          targetRotation = Math.PI / 2;
          break;
        case "NegativeX":
          targetRotation = -Math.PI / 2;
          break;
        case "PositiveY":
          targetRotation = 0;
          break;
        case "NegativeY":
          targetRotation = Math.PI;
          break;
      }

      // 平滑旋转动画
      const duration = 300;
      const startRotation = model.object.rotation.y;
      const startTime = performance.now();

      await new Promise((resolve) => {
        function animate() {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 2);

          if (model.object) {
            model.object.rotation.y =
              startRotation + (targetRotation - startRotation) * easeProgress;
          }

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        }
        animate();
      });
    }
  });

  // move_to: 移动单位到指定位置
  messageQueue.registerHandler("move_to", async (data, context) => {
    const { id, to } = data;
    console.log(`[Handler] move_to id=${id}, to=${to}`);

    const model = findModelById(context.models || [], id);
    if (model && model.object && context.gridCellSize) {
      const [gridX, gridZ] = to;
      const cellSize = context.gridCellSize;
      // 以(0,0)为中心，地图范围 -7 到 7
      const targetX = (gridX - 7) * cellSize;
      const targetZ = (gridZ - 7) * cellSize;
      const targetY = model.object.position.y;

      // 使用model.js的animateModelMove
      if (context.animateModelMove) {
        await new Promise((resolve) => {
          context.animateModelMove(
            model,
            { x: targetX, y: targetY, z: targetZ },
            resolve
          );
        });
      }
      
      // 移动完成后调用回调
      if (context.onMoveComplete) {
        context.onMoveComplete(id);
      }
    }
  });

  // display_can_move: 显示可移动状态（绿色圈圈）（同步处理）
  messageQueue.registerHandler("display_can_move", (data, context) => {
    const { id, can_move } = data;
    const canMove = can_move === "true" || can_move === true;
    // console.log(`[Handler] display_can_move id=${id}, can_move=${canMove}`);

    // TODO: 在模型脚下添加/移除绿色圈圈指示器
    if (context.onDisplayCanMove) {
      context.onDisplayCanMove(id, canMove);
    }
  });

  // display_can_attack: 显示可攻击状态（红色圈圈）（同步处理）
  messageQueue.registerHandler("display_can_attack", (data, context) => {
    const { id, can_attack } = data;
    const canAttack = can_attack === "true" || can_attack === true;
    // console.log(`[Handler] display_can_attack id=${id}, can_attack=${canAttack}`);

    // TODO: 在模型脚下添加/移除红色圈圈指示器
    if (context.onDisplayCanAttack) {
      context.onDisplayCanAttack(id, canAttack);
    }
  });

  // clear_state: 清除单位的所有状态（同步处理）
  messageQueue.registerHandler("clear_state", (data, context) => {
    const { id } = data;
    // console.log(`[Handler] clear_state id=${id}`);

    if (context.onClearState) {
      context.onClearState(id);
    }
  });

  // animate_move: 视角移动到单位
  messageQueue.registerHandler("animate_move", async (data, context) => {
    const { id } = data;
    console.log(`[Handler] animate_move id=${id}`);

    const model = findModelById(context.models || [], id);
    if (model && context.camera && context.controls && context.focusOnModel) {
      const focusData = context.focusOnModel(
        model.object,
        context.camera,
        context.controls
      );

      // 设置聚焦状态
      if (context.focusState) {
        context.focusState.focusPosition = focusData.focusPosition;
        context.focusState.focusTarget = focusData.focusTarget;
        context.focusState.lerpFactor = focusData.lerpFactor;
      }

      // 等待聚焦完成
      await delay(1000);
    }
  });

  // animate_reset: 视角复位
  messageQueue.registerHandler("animate_reset", async (data, context) => {
    console.log(`[Handler] animate_reset`);

    if (context.camera && context.controls) {
      // 重置到默认视角
      const targetPos = { x: 0, y: 2, z: 5 };
      const targetLookAt = { x: 0, y: 0, z: 0 };

      if (context.focusState) {
        context.focusState.focusPosition = targetPos;
        context.focusState.focusTarget = targetLookAt;
        context.focusState.lerpFactor = 0.08;
      }

      await delay(1000);
    }
  });

  // put_map_block: 放置地图块（同步处理，避免大量Promise创建）
  messageQueue.registerHandler("put_map_block", (data, context) => {
    const { position } = data;
    // console.log(`[Handler] put_map_block at ${position}`)  // 日志太多，已注释

    if (context.onPutMapBlock) {
      context.onPutMapBlock(position);
    }
    // 不返回Promise，同步处理
  });

  // 计数器：跟踪范围块数量
  let moveBlockCount = 0;
  let attackBlockCount = 0;

  // set_move_block: 设置地图块为可移动（绿色）（同步处理）
  messageQueue.registerHandler("set_move_block", (data, context) => {
    const { position } = data;
    moveBlockCount++;

    if (context.onSetMoveBlock) {
      context.onSetMoveBlock(position);
    }

    // 只输出汇总，不输出每个地块
    // console.log(`[Handler] 移动范围 #${moveBlockCount}: [${position}]`);
  });

  // set_attack_block: 设置地图块为可攻击（红色）（同步处理）
  messageQueue.registerHandler("set_attack_block", (data, context) => {
    const { position } = data;
    attackBlockCount++;

    if (context.onSetAttackBlock) {
      context.onSetAttackBlock(position);
    }

    // 只在第一个或每10个时输出日志
    if (attackBlockCount === 1 || attackBlockCount % 10 === 0) {
      console.log(`[Handler] 攻击范围已显示 ${attackBlockCount} 个地块`);
    }
  });

  // clear_block: 清除地板块状态（同步处理）
  let clearBlockCount = 0;
  let lastClearTime = Date.now();

  messageQueue.registerHandler("clear_block", (data, context) => {
    const { position } = data;

    if (context.onClearBlock) {
      context.onClearBlock(position);
    }

    clearBlockCount++;

    // 如果是连续清除（批量操作），只输出汇总
    const now = Date.now();
    if (now - lastClearTime > 500) {
      // 新的一轮清除
      if (clearBlockCount > 1) {
        console.log(`[Handler] ⬜ 已清除 ${clearBlockCount} 个地板块`);
      }
      clearBlockCount = 0;

      // 重置计数器
      if (moveBlockCount > 0) {
        console.log(`[Handler] 移动范围已清除（共 ${moveBlockCount} 个）`);
        moveBlockCount = 0;
      }
      if (attackBlockCount > 0) {
        console.log(`[Handler] 攻击范围已清除（共 ${attackBlockCount} 个）`);
        attackBlockCount = 0;
      }
    }
    lastClearTime = now;
  });

  // attack_complete: 攻击完成
  messageQueue.registerHandler("attack_complete", (data, context) => {
    const { id } = data;
    console.log(`[Handler] attack_complete id=${id}`);
    
    // 攻击完成后调用回调
    if (context.onAttackComplete) {
      context.onAttackComplete(id);
    }
  });

  // on_game_round_pass: 回合结束（清除所有状态并恢复）（同步处理）
  messageQueue.registerHandler("on_game_round_pass", (data, context) => {
    console.log("[Handler] 回合结束 - 恢复所有铜偶状态");
    
    // 该处理器主要由后端处理，前端只需要确认消息接收
    // 后端会自动：
    // 1. 清除所有移动/攻击/传输地块
    // 2. 恢复所有铜偶的可移动和可攻击状态
    // 3. 重新显示状态指示器（绿圈/红圈）
    
    console.log("[Handler] 回合结束处理完成");
  });

  console.log(
    "[MessageQueue] 已注册所有消息处理器，共",
    messageQueue.handlers.size,
    "个"
  );
  console.log(
    "[MessageQueue] 已注册的处理器列表:",
    Array.from(messageQueue.handlers.keys())
  );
}
