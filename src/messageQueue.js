// 消息任务队列系统
// 处理从后端global_msg发来的消息，按顺序执行动画和操作
import log from './log.js';
import { emitEvent, onEvent, offEvent, EventTypes } from './utils/eventBus.js';

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
      log('[MessageQueue] 收到消息:', message.type_msg);
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
          log('[MessageQueue] 未找到处理器:', type_msg);
          log(
            '[MessageQueue] 当前已注册的处理器:',
            Array.from(this.handlers.keys())
          );
        }
      } catch (error) {
        log('[MessageQueue] 处理消息失败:', error);
        log('[MessageQueue] 错误详情:', error.message);
        log('[MessageQueue] 错误堆栈:', error.stack);
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
  return models.find(m => m.id === id);
}

// 辅助函数：创建延迟Promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 注册所有消息处理器
export function registerAllHandlers() {
  log('[MessageQueue] 开始注册消息处理器...');

  // handle_on_click_copper: 当铜偶被点击时，后端返回铜偶信息
  messageQueue.registerHandler(
    'handle_on_click_copper',
    async (data, context) => {
      const { copper, resources, has_attack_targets } = data;
      log(
        `[Handler] 点击铜偶: ${
          copper.copper.copper_info?.name || 'Unknown'
        } (ID=${copper.id})`
      );
      log(
        `[Handler] 铜偶状态: HP=${copper.now_health}/${copper.copper.attribute.health}, 可移动=${copper.can_move}, 可攻击=${copper.can_attack}, 可召唤=${copper.can_summon}, 可建造=${copper.can_build}, 有攻击目标=${has_attack_targets}`
      );
      log(`[Handler] 铜偶类型: ${copper.copper?.copper_type}`);

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

  // handle_on_click_enemy: 当敌人被点击时（友方召唤物或野生敌人），后端返回敌人信息
  messageQueue.registerHandler(
    'handle_on_click_enemy',
    async (data, context) => {
      const { enemy, resources, has_attack_targets } = data;
      const isOwned = enemy.owned || false;
      const enemyType = isOwned ? '友方召唤物' : '野生敌人';

      log(
        `[Handler] 点击${enemyType}: ${
          enemy.enemy_base?.name || 'Unknown'
        } (ID=${enemy.id})`
      );
      log(
        `[Handler] 状态: HP=${enemy.now_health}/${enemy.enemy_base.health}, 可移动=${enemy.can_move}, 可攻击=${enemy.can_attack}, owned=${enemy.owned}, 有攻击目标=${has_attack_targets}`
      );

      // 将enemy数据转换为类似copper的格式，以便前端处理
      const copperLikeData = {
        id: enemy.id,
        now_health: enemy.now_health,
        // 野生敌人不可操控，所有操作都设为false
        can_move: isOwned ? enemy.can_move : false,
        can_attack: isOwned ? enemy.can_attack : false,
        can_summon: false,
        position: enemy.position,
        isEnemy: !isOwned, // 标记为野生敌人（只读模式）
        isOwnedEnemy: isOwned, // 标记为友方召唤物（用于判断事件类型）
        copper: {
          copper_info: {
            name: enemy.enemy_base?.name || (isOwned ? '召唤物' : '敌人'),
          },
          attribute: {
            health: enemy.enemy_base.health,
            attack: enemy.enemy_base.attack,
            defense: enemy.enemy_base.defense,
            speed: enemy.enemy_base.speed,
          },
        },
      };

      // 高亮选中的单位（所有单位都可以高亮，用于表示用户正在查看哪个单位）
      if (context.highlightSelectedCopper) {
        context.highlightSelectedCopper(enemy.id);
      }

      // 显示信息面板
      if (context.onShowCopperInfo) {
        context.onShowCopperInfo(copperLikeData, resources, has_attack_targets);
      }
    }
  );

  // handle_on_click_structure: 当建筑被点击时，后端返回建筑信息
  messageQueue.registerHandler(
    'handle_on_click_structure',
    async (data, context) => {
      const { structure, resources } = data;
      const isOwned = structure.owned || false;
      const structureType = isOwned ? '玩家建筑' : '中立建筑';

      log(
        `[Handler] 点击${structureType}: ${
          structure.structure_base?.name || 'Unknown'
        } (ID=${structure.id})`
      );
      log(
        `[Handler] 建筑状态: HP=${structure.now_health}/${structure.structure_base.health}, 可移动=${structure.can_move}, 可攻击=${structure.can_attack}, owned=${structure.owned}, 有储物空间=${structure.structure_base.has_storage}`
      );

      // 高亮选中的建筑
      if (context.highlightSelectedCopper) {
        context.highlightSelectedCopper(structure.id);
      }

      // 显示建筑信息
      if (context.onShowStructureInfo) {
        context.onShowStructureInfo(structure, resources);
      }
    }
  );

  // set_copper: 在指定地点放置铜偶
  messageQueue.registerHandler('set_copper', async (data, context) => {
    const { id, position, copper } = data;

    // 通知外部记录实际的铜偶ID（兼容旧方式+新事件总线）
    if (!window.__ACTUAL_COPPER_IDS__) {
      window.__ACTUAL_COPPER_IDS__ = [];
    }
    window.__ACTUAL_COPPER_IDS__.push(copper.id);
    emitEvent(EventTypes.COPPER_ID_ADDED, copper.id);

    // 等待铜偶模型加载完成，确保后续的 change_direction 消息能找到模型
    if (context.onSetCopper) {
      await context.onSetCopper(id, position, copper);
    }
  });

  // 统一逻辑：工匠也使用 display_can_summon 圈显示“可建造”状态

  // set_enemy: 在指定地点放置敌人
  messageQueue.registerHandler('set_enemy', async (data, context) => {
    const { id, position, enemy } = data;

    if (context.onSetEnemy) {
      context.onSetEnemy(id, position, enemy);
    }

    // 如果是友方召唤物（owned=true），更新资源显示（因为召唤消耗资源）
    if (enemy.owned) {
      emitEvent(EventTypes.UPDATE_RESOURCES);
    }
  });

  // set_material: 在指定地点放置矿物
  messageQueue.registerHandler('set_material', async (data, context) => {
    const { id, position, material } = data;
    if (context.onSetMaterial) {
      await context.onSetMaterial(id, position, material);
    }
  });

  // set_structure: 在指定地点放置建筑
  messageQueue.registerHandler('set_structure', async (data, context) => {
    const { id, position, structure } = data;

    if (context.onSetStructure) {
      await context.onSetStructure(id, position, structure);
    }

    // 如果是玩家建筑（owned=true），更新资源显示（因为建造消耗资源）
    if (structure.owned) {
      emitEvent(EventTypes.UPDATE_RESOURCES);
    }
  });

  // remove_unit: 删除单位（带消失动画）
  messageQueue.registerHandler('remove_unit', async (data, context) => {
    const { id } = data;

    const model = findModelById(context.models || [], id);

    // 检查是否是敌人死亡（非友方召唤物）
    const isEnemyDeath = model && model.type === 'enemy' && !model.isOwned;
    const enemyPosition = isEnemyDeath ? model.position : null;

    log(
      `[Handler] remove_unit: ID=${id}, type=${model?.type}, isOwned=${model?.isOwned}, isEnemyDeath=${isEnemyDeath}, position=${JSON.stringify(enemyPosition)}`
    );

    if (model && model.object) {
      // 先克隆所有材质，确保不影响其他使用相同材质的模型
      model.object.traverse(child => {
        if (child.material) {
          // 如果是材质数组
          if (Array.isArray(child.material)) {
            child.material = child.material.map(mat => mat.clone());
          } else {
            child.material = child.material.clone();
          }
        }
      });

      // 淡出动画
      const duration = 500;
      const startTime = performance.now();

      await new Promise(resolve => {
        function animate() {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          if (model.object) {
            model.object.traverse(child => {
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.transparent = true;
                    mat.opacity = 1 - progress;
                  });
                } else {
                  child.material.transparent = true;
                  child.material.opacity = 1 - progress;
                }
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

      // 释放所有资源，防止内存泄漏
      model.object.traverse(child => {
        // 释放几何体
        if (child.geometry) {
          child.geometry.dispose();
        }

        // 释放材质
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              // 释放材质的纹理
              if (mat.map) mat.map.dispose();
              if (mat.lightMap) mat.lightMap.dispose();
              if (mat.bumpMap) mat.bumpMap.dispose();
              if (mat.normalMap) mat.normalMap.dispose();
              if (mat.specularMap) mat.specularMap.dispose();
              if (mat.envMap) mat.envMap.dispose();
              if (mat.alphaMap) mat.alphaMap.dispose();
              if (mat.aoMap) mat.aoMap.dispose();
              if (mat.displacementMap) mat.displacementMap.dispose();
              if (mat.emissiveMap) mat.emissiveMap.dispose();
              if (mat.metalnessMap) mat.metalnessMap.dispose();
              if (mat.roughnessMap) mat.roughnessMap.dispose();
              mat.dispose();
            });
          } else {
            // 释放材质的纹理
            if (child.material.map) child.material.map.dispose();
            if (child.material.lightMap) child.material.lightMap.dispose();
            if (child.material.bumpMap) child.material.bumpMap.dispose();
            if (child.material.normalMap) child.material.normalMap.dispose();
            if (child.material.specularMap)
              child.material.specularMap.dispose();
            if (child.material.envMap) child.material.envMap.dispose();
            if (child.material.alphaMap) child.material.alphaMap.dispose();
            if (child.material.aoMap) child.material.aoMap.dispose();
            if (child.material.displacementMap)
              child.material.displacementMap.dispose();
            if (child.material.emissiveMap)
              child.material.emissiveMap.dispose();
            if (child.material.metalnessMap)
              child.material.metalnessMap.dispose();
            if (child.material.roughnessMap)
              child.material.roughnessMap.dispose();
            child.material.dispose();
          }
        }
      });

      // 从models数组移除
      if (context.models) {
        const index = context.models.indexOf(model);
        if (index > -1) {
          context.models.splice(index, 1);
        }
      }

      // 清除该单位的状态指示器（绿圈/红圈）
      if (context.onClearState) {
        context.onClearState(id);
      }

      // 清除该单位的血条
      if (context.onRemoveHealthBar) {
        context.onRemoveHealthBar(id);
      }

      // 如果是铜偶，从玩家铜偶列表中移除
      if (model.type === 'copper' && context.onRemoveCopper) {
        context.onRemoveCopper(id);
      }
    }

    // 如果是敌人死亡，更新资源并显示获取特效
    if (isEnemyDeath && enemyPosition) {
      log('[Handler] 敌人死亡，触发资源更新...');

      // 监听资源更新完成事件（单次）
      const handleResourcesUpdated = changes => {
        log('[Handler] 资源更新完成，变化:', changes);

        // 在敌人位置显示资源获取特效
        if (context.onShowResourceGain && Object.keys(changes).length > 0) {
          log('[Handler] 显示资源获取特效:', enemyPosition, changes);
          context.onShowResourceGain(enemyPosition, changes);
        }
      };

      // 注册单次监听器
      onEvent(EventTypes.RESOURCES_UPDATED, handleResourcesUpdated);

      // 触发资源更新
      emitEvent(EventTypes.UPDATE_RESOURCES);

      // 延迟后清理监听器（避免内存泄漏）
      setTimeout(() => {
        offEvent(EventTypes.RESOURCES_UPDATED, handleResourcesUpdated);
      }, 1000);
    }
  });

  // change_direction: 改变单位朝向
  messageQueue.registerHandler('change_direction', async (data, context) => {
    const { id, direction } = data;

    const model = findModelById(context.models || [], id);
    if (model && model.object) {
      // 前端模型默认朝向+Z（正面），rotation.y = 0 表示正面朝上
      // 但后端的方向指令是基于"+X为基准"的假设
      // 需要转换：后端PositiveY(上) → 前端0度, 后端PositiveX(右) → 前端90度
      let targetRotation = 0;
      switch (direction) {
        case 'PositiveY': // 后端：向上(+Z) → 前端：0度（正面朝上）
          targetRotation = 0; // 0度
          break;
        case 'PositiveX': // 后端：向右(+X) → 前端：90度（侧面朝右）
          targetRotation = Math.PI / 2; // 90度
          break;
        case 'NegativeY': // 后端：向下(-Z) → 前端：180度（背面朝下）
          targetRotation = Math.PI; // 180度
          break;
        case 'NegativeX': // 后端：向左(-X) → 前端：-90度（侧面朝左）
          targetRotation = -Math.PI / 2; // -90度
          break;
      }

      // 规范化角度到 [-π, π] 范围
      let startRotation = model.object.rotation.y;
      startRotation = Math.atan2(
        Math.sin(startRotation),
        Math.cos(startRotation)
      );

      // 计算最短旋转路径
      let rotationDiff = targetRotation - startRotation;
      if (rotationDiff > Math.PI) {
        rotationDiff -= 2 * Math.PI;
      } else if (rotationDiff < -Math.PI) {
        rotationDiff += 2 * Math.PI;
      }

      // 平滑旋转动画
      const duration = 300;
      const startTime = performance.now();

      await new Promise(resolve => {
        function animate() {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 2);

          if (model.object) {
            model.object.rotation.y =
              startRotation + rotationDiff * easeProgress;
          }

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            // 确保最终角度准确
            if (model.object) {
              model.object.rotation.y = targetRotation;
            }
            resolve();
          }
        }
        animate();
      });
    }
  });

  // move_to: 移动单位到指定位置
  messageQueue.registerHandler('move_to', async (data, context) => {
    const { id, to } = data;

    const model = findModelById(context.models || [], id);
    if (model && model.object && context.gridCellSize) {
      const [gridX, gridZ] = to;
      // 直接使用全局坐标系统：全局坐标 (0,0) 对应世界坐标 (0,0)
      const targetX = gridX;
      const targetZ = gridZ;
      const targetY = model.object.position.y;

      // 更新模型的网格坐标（用于掉落物位置等）
      model.position = [gridX, gridZ];

      // 注意：朝向由后端的 change_direction 消息控制
      // move_to 之前后端会先发送 change_direction，所以这里不需要自动旋转

      // 移动开始时调用回调（用于跟踪敌人移动）
      if (context.onMoveStart) {
        context.onMoveStart(id, model);
      }

      // 使用model.js的animateModelMove
      if (context.animateModelMove) {
        await new Promise(resolve => {
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
  messageQueue.registerHandler('display_can_move', (data, context) => {
    const { id, can_move } = data;
    const canMove = can_move === 'true' || can_move === true;
    // console.log(`[Handler] display_can_move id=${id}, can_move=${canMove}`);

    // TODO: 在模型脚下添加/移除绿色圈圈指示器
    if (context.onDisplayCanMove) {
      context.onDisplayCanMove(id, canMove);
    }
  });

  // display_can_attack: 显示可攻击状态（红色圈圈）（同步处理）
  messageQueue.registerHandler('display_can_attack', (data, context) => {
    const { id, can_attack } = data;
    const canAttack = can_attack === 'true' || can_attack === true;
    // console.log(`[Handler] display_can_attack id=${id}, can_attack=${canAttack}`);

    // TODO: 在模型脚下添加/移除红色圈圈指示器
    if (context.onDisplayCanAttack) {
      context.onDisplayCanAttack(id, canAttack);
    }
  });

  // display_can_summon: 显示可召唤状态（黄色圈圈）（同步处理）
  messageQueue.registerHandler('display_can_summon', (data, context) => {
    const { id, can_summon } = data;
    const canSummon = can_summon === 'true' || can_summon === true;
    log(`[Handler] display_can_summon id=${id}, can_summon=${canSummon}`);

    // 在模型脚下添加/移除黄色圈圈指示器
    if (context.onDisplayCanSummon) {
      context.onDisplayCanSummon(id, canSummon);
    }
  });

  // update_health: 更新单位血量显示（同步处理）
  messageQueue.registerHandler('update_health', (data, context) => {
    const { id, now_health, max_health } = data;
    // console.log(`[Handler] update_health id=${id}, hp=${now_health}/${max_health}`);

    if (context.onUpdateHealth) {
      context.onUpdateHealth(id, now_health, max_health);
    }
  });

  // clear_state: 清除单位的所有状态（同步处理）
  messageQueue.registerHandler('clear_state', (data, context) => {
    const { id } = data;
    // console.log(`[Handler] clear_state id=${id}`);

    if (context.onClearState) {
      context.onClearState(id);
    }
  });

  // animate_move: 视角移动到单位
  messageQueue.registerHandler('animate_move', async (data, context) => {
    const { id } = data;

    const model = findModelById(context.models || [], id);

    if (!model) {
      log(`[Handler] animate_move: 找不到模型 ID=${id}`);
      return;
    }

    // 检查是否禁用了自动聚焦
    if (window.disableAutoFocus) {
      log(`[Handler] animate_move: 自动聚焦已禁用，跳过 ID=${id}`);
      return;
    }

    // 检查是否需要跟随敌人视角（可以在 context 中设置）
    // 默认情况下，敌人移动时不跟随视角，避免频繁跳转
    const followEnemies =
      context.followEnemies !== undefined ? context.followEnemies : false;
    if (model.type === 'enemy' && !followEnemies) {
      log(
        `[Handler] animate_move: 跳过敌人 ID=${id} 的视角跟随（可通过 context.followEnemies = true 启用）`
      );
      return;
    }

    if (context.camera && context.focusOnModel) {
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
        log(`[Handler] animate_move: 聚焦到单位 ID=${id} (${model.name})`);
      }

      // 等待聚焦完成
      await delay(1000);
    }
  });

  // animate_reset: 视角复位
  messageQueue.registerHandler('animate_reset', async (data, context) => {
    log(`[Handler] animate_reset`);

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
  messageQueue.registerHandler('put_map_block', (data, context) => {
    const { position } = data;
    // console.log(`[Handler] put_map_block at ${position}`)  // 日志太多，已注释

    if (context.onPutMapBlock) {
      context.onPutMapBlock(position);
    }
    // 不返回Promise，同步处理
  });

  // put_room_blocks: 批量放置房间地图块（分帧创建，避免卡顿）
  messageQueue.registerHandler('put_room_blocks', async (data, context) => {
    const { room_position, size } = data;
    const [roomX, roomY] = room_position;

    log(
      `[Handler] 📦 批量创建房间地图块: 位置[${roomX}, ${roomY}], 大小${size}x${size}`
    );

    if (!context.onPutMapBlock) {
      log('[Handler] ⚠️ context.onPutMapBlock 不存在，无法创建地图块');
      return;
    }

    log('[Handler] ✓ context.onPutMapBlock 存在，开始创建地图块...');

    // 分帧创建地图块，每帧创建一部分，避免一次性创建225个造成卡顿
    const blocksPerFrame = 32; // 每帧创建32个块（225/32 ≈ 8帧）
    const totalBlocks = size * size;
    let createdBlocks = 0;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const globalPos = [roomX + x, roomY + y];
        context.onPutMapBlock(globalPos);
        createdBlocks++;

        // 每创建 blocksPerFrame 个块后，让出控制权到下一帧
        if (createdBlocks % blocksPerFrame === 0) {
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
      }
    }

    log(`[Handler] ✅ 房间地图块创建完成: ${totalBlocks}个块`);
  });

  // put_resource_marker: 在地图块上显示资源标记
  messageQueue.registerHandler('put_resource_marker', (data, context) => {
    const { position } = data;

    if (context.onPutResourceMarker) {
      context.onPutResourceMarker(position);
    }
  });

  // clear_resource_marker: 清除资源标记
  messageQueue.registerHandler('clear_resource_marker', (data, context) => {
    const { position } = data;

    if (context.onClearResourceMarker) {
      context.onClearResourceMarker(position);
    }
  });

  // 计数器：跟踪范围块数量
  let moveBlockCount = 0;
  let attackBlockCount = 0;
  let summonBlockCount = 0;

  // set_move_block: 设置地图块为可移动（绿色）（同步处理）
  messageQueue.registerHandler('set_move_block', (data, context) => {
    const { position } = data;
    moveBlockCount++;

    if (context.onSetMoveBlock) {
      context.onSetMoveBlock(position);
    }

    // 只输出汇总，不输出每个地块
    // console.log(`[Handler] 移动范围 #${moveBlockCount}: [${position}]`);
  });

  // set_attack_block: 设置地图块为可攻击（红色）（同步处理）
  messageQueue.registerHandler('set_attack_block', (data, context) => {
    const { position } = data;
    attackBlockCount++;

    if (context.onSetAttackBlock) {
      context.onSetAttackBlock(position);
    }

    // 只在第一个或每10个时输出日志
    if (attackBlockCount === 1 || attackBlockCount % 10 === 0) {
      log(`[Handler] 攻击范围已显示 ${attackBlockCount} 个地块`);
    }
  });

  // set_can_summon_blocks: 设置地图块为可召唤（黄色）（同步处理）
  messageQueue.registerHandler('set_can_summon_blocks', (data, context) => {
    const { position } = data;
    summonBlockCount++;

    if (context.onSetCanSummonBlock) {
      context.onSetCanSummonBlock(position);
    }

    // 只在第一个或每10个时输出日志
    if (summonBlockCount === 1 || summonBlockCount % 10 === 0) {
      log(`[Handler] 召唤范围已显示 ${summonBlockCount} 个地块`);
    }
  });

  // clear_block: 清除地板块状态（同步处理）
  let clearBlockCount = 0;
  let lastClearTime = Date.now();

  messageQueue.registerHandler('clear_block', (data, context) => {
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
        log(`[Handler] ⬜ 已清除 ${clearBlockCount} 个地板块`);
      }
      clearBlockCount = 0;

      // 重置计数器
      if (moveBlockCount > 0) {
        log(`[Handler] 移动范围已清除（共 ${moveBlockCount} 个）`);
        moveBlockCount = 0;
      }
      if (attackBlockCount > 0) {
        log(`[Handler] 攻击范围已清除（共 ${attackBlockCount} 个）`);
        attackBlockCount = 0;
      }
      if (summonBlockCount > 0) {
        log(`[Handler] 召唤范围已清除（共 ${summonBlockCount} 个）`);
        summonBlockCount = 0;
      }
    }
    lastClearTime = now;
  });

  // attack_complete: 攻击完成
  messageQueue.registerHandler('attack_complete', (data, context) => {
    const { id } = data;

    // 攻击完成后调用回调
    if (context.onAttackComplete) {
      context.onAttackComplete(id);
    }
  });

  // on_game_round_pass: 回合结束（清除所有状态并恢复）（同步处理）
  messageQueue.registerHandler('on_game_round_pass', (data, context) => {
    // 该处理器主要由后端处理，前端只需要确认消息接收
    // 后端会自动：
    // 1. 清除所有移动/攻击/传输地块
    // 2. 恢复所有铜偶的可移动和可攻击状态
    // 3. 重新显示状态指示器（绿圈/红圈）
  });

  // craft_success: 合成成功
  messageQueue.registerHandler('craft_success', (data, context) => {
    if (context.onCraftResult) {
      context.onCraftResult(true, data.message || '合成成功');
    }
  });

  // craft_failed: 合成失败
  messageQueue.registerHandler('craft_failed', (data, context) => {
    if (context.onCraftResult) {
      context.onCraftResult(false, data.message || '合成失败');
    }
  });

  // cannot_pick_up_item: 无法拾取物品
  messageQueue.registerHandler('cannot_pick_up_item', (data, context) => {
    log('[Handler] 无法拾取物品:', data.message || data);
  });

  // equipment_slot_full: 装备槽已满
  messageQueue.registerHandler('equipment_slot_full', (data, context) => {
    log('[Handler] 装备槽已满:', data.message || data);
  });

  // inventory_full: 背包已满
  messageQueue.registerHandler('inventory_full', (data, context) => {
    log('[Handler] 背包已满:', data.message || data);
  });

  // resource_not_enough: 资源不足
  messageQueue.registerHandler('resource_not_enough', (data, context) => {
    let message = '资源不足';

    // 如果有详细的缺少资源信息，生成详细提示
    if (
      data.missing &&
      Array.isArray(data.missing) &&
      data.missing.length > 0
    ) {
      const resourceNames = {
        HeartCrystalDust: '心晶尘',
        RecallGear: '回响齿轮',
        SpiritalSpark: '灵性火花',
        RefinedCopper: '精炼铜锭',
        ResonantCrystal: '共鸣星晶',
      };

      const missingList = data.missing
        .map(item => {
          const name = resourceNames[item.type] || item.type;
          const shortage = item.needed - item.current;
          return `${name} (缺少 ${shortage})`;
        })
        .join('、');

      message = `资源不足: ${missingList}`;
    }

    log('[Handler] 资源不足:', message);
    // TODO: 显示资源不足提示给玩家
    if (context.onResourceNotEnough) {
      context.onResourceNotEnough(message);
    }
  });

  // summon_failed: 召唤失败
  messageQueue.registerHandler('summon_failed', (data, context) => {
    log('[Handler] 召唤失败:', data.message || data);
    if (context.onSummonFailed) {
      context.onSummonFailed(data.message || '召唤失败');
    }
  });

  // summon_expired: 召唤物生命周期结束（同步处理）
  messageQueue.registerHandler('summon_expired', (data, context) => {
    const { id, message } = data;
    log(`[Handler] 召唤物消失: ID=${id}, ${message}`);
    // remove_unit 会自动处理模型移除，这里只是显示日志
  });

  // get_summon_menu: 获取召唤菜单（返回可召唤的敌人列表）
  messageQueue.registerHandler('get_summon_menu', (data, context) => {
    const { contents } = data;
    log('[Handler] 收到召唤菜单:', contents);
    // TODO: 显示敌人选择菜单
    if (context.onShowSummonMenu) {
      context.onShowSummonMenu(contents);
    }
  });

  // get_structure_menu: 获取建筑建造菜单（返回可建造的建筑列表）
  messageQueue.registerHandler('get_structure_menu', (data, context) => {
    const { contents } = data;

    if (!contents || contents.length === 0) {
      log('[Handler] ⚠️ 建筑列表为空');
      return;
    }

    // 过滤掉充能线圈（玩家不能建造）
    const filteredContents = contents.filter(structure => {
      return structure.name !== '充能线圈';
    });

    log('[Handler] 收到建造菜单，共', filteredContents.length, '个建筑');

    if (context.onShowStructureMenu) {
      context.onShowStructureMenu(filteredContents);
    }
  });

  // drill_resource_generate: 矿钻产出资源特效（同步处理）
  messageQueue.registerHandler('drill_resource_generate', (data, context) => {
    const { position, resource_type, amount } = data;
    log(
      `[Handler] 矿钻产出资源: 位置=${JSON.stringify(position)}, 类型=${resource_type}, 数量=${amount}`
    );

    // 构建资源变化对象
    const resourceChanges = {
      [resource_type]: parseInt(amount),
    };

    // 显示资源获取特效
    if (context.onShowResourceGain) {
      context.onShowResourceGain(position, resourceChanges);
    }

    // 触发资源更新
    emitEvent(EventTypes.UPDATE_RESOURCES);
  });

  // game_over: 游戏结束
  messageQueue.registerHandler('game_over', (data, context) => {
    log('[Handler] 游戏结束');

    // 显示游戏结束对话框
    if (context.onGameOver) {
      context.onGameOver();
    }
  });

  // success: 游戏成功
  messageQueue.registerHandler('success', (data, context) => {
    log('[Handler] 游戏胜利！');

    // 显示游戏成功对话框
    if (context.onGameSuccess) {
      context.onGameSuccess();
    }
  });

  // Message handlers registered
}
