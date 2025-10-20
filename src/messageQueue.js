// 消息任务队列系统
// 处理从后端global_msg发来的消息，按顺序执行动画和操作

class MessageQueue {
  constructor() {
    this.queue = []
    this.isProcessing = false
    this.handlers = new Map()
    this.sceneContext = null // 存储3D场景上下文
  }

  // 设置场景上下文（包含scene, models等）
  setSceneContext(context) {
    this.sceneContext = context
  }

  // 注册消息处理器
  registerHandler(messageType, handler) {
    this.handlers.set(messageType, handler)
  }

  // 添加消息到队列
  enqueue(message) {
    console.log('[MessageQueue] 收到消息:', message)
    this.queue.push(message)
    if (!this.isProcessing) {
      this.processNext()
    }
  }

  // 处理下一个消息
  async processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const message = this.queue.shift()

    try {
      const { type_msg, content } = message
      const handler = this.handlers.get(type_msg)
      
      if (handler) {
        console.log('[MessageQueue] 处理消息:', type_msg, content)
        const data = JSON.parse(content)
        await handler(data, this.sceneContext || {})
      } else {
        console.warn('[MessageQueue] 未找到处理器:', type_msg)
        console.log('[MessageQueue] 当前已注册的处理器:', Array.from(this.handlers.keys()))
      }
    } catch (error) {
      console.error('[MessageQueue] 处理消息失败:', error)
    }

    // 继续处理下一个消息
    setTimeout(() => this.processNext(), 100)
  }
}

// 创建全局单例
export const messageQueue = new MessageQueue()

// 辅助函数：根据ID查找模型
function findModelById(models, id) {
  return models.find(m => m.id === id)
}

// 辅助函数：创建延迟Promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 注册所有消息处理器
export function registerAllHandlers() {
  console.log('[MessageQueue] 开始注册消息处理器...')
  
  // set_copper: 在指定地点放置铜偶
  messageQueue.registerHandler('set_copper', async (data, context) => {
    const { id, position, copper } = data
    console.log(`[Handler] set_copper at ${position}, id=${id}`)
    
    // TODO: 根据copper数据加载3D模型
    // 这里需要和model.js的loadModel配合
    if (context.onSetCopper) {
      context.onSetCopper(id, position, copper)
    }
  })

  // set_enemy: 在指定地点放置敌人
  messageQueue.registerHandler('set_enemy', async (data, context) => {
    const { id, position, enemy } = data
    console.log(`[Handler] set_enemy at ${position}, id=${id}`)
    
    if (context.onSetEnemy) {
      context.onSetEnemy(id, position, enemy)
    }
  })

  // remove_unit: 删除单位（带消失动画）
  messageQueue.registerHandler('remove_unit', async (data, context) => {
    const { id } = data
    console.log(`[Handler] remove_unit id=${id}`)
    
    const model = findModelById(context.models || [], id)
    if (model && model.object) {
      // 淡出动画
      const duration = 500
      const startTime = performance.now()
      
      await new Promise(resolve => {
        function animate() {
          const elapsed = performance.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          
          if (model.object) {
            model.object.traverse(child => {
              if (child.material) {
                child.material.transparent = true
                child.material.opacity = 1 - progress
              }
            })
          }
          
          if (progress < 1) {
            requestAnimationFrame(animate)
          } else {
            resolve()
          }
        }
        animate()
      })
      
      // 从场景移除
      if (context.scene) {
        context.scene.remove(model.object)
      }
      
      // 从models数组移除
      if (context.models) {
        const index = context.models.indexOf(model)
        if (index > -1) {
          context.models.splice(index, 1)
        }
      }
    }
  })

  // change_direction: 改变单位朝向
  messageQueue.registerHandler('change_direction', async (data, context) => {
    const { id, direction } = data
    console.log(`[Handler] change_direction id=${id}, direction=${direction}`)
    
    const model = findModelById(context.models || [], id)
    if (model && model.object) {
      let targetRotation = 0
      switch (direction) {
        case 'PositiveX': targetRotation = Math.PI / 2; break
        case 'NegativeX': targetRotation = -Math.PI / 2; break
        case 'PositiveY': targetRotation = 0; break
        case 'NegativeY': targetRotation = Math.PI; break
      }
      
      // 平滑旋转动画
      const duration = 300
      const startRotation = model.object.rotation.y
      const startTime = performance.now()
      
      await new Promise(resolve => {
        function animate() {
          const elapsed = performance.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          const easeProgress = 1 - Math.pow(1 - progress, 2)
          
          if (model.object) {
            model.object.rotation.y = startRotation + (targetRotation - startRotation) * easeProgress
          }
          
          if (progress < 1) {
            requestAnimationFrame(animate)
          } else {
            resolve()
          }
        }
        animate()
      })
    }
  })

  // move_to: 移动单位到指定位置
  messageQueue.registerHandler('move_to', async (data, context) => {
    const { id, to } = data
    console.log(`[Handler] move_to id=${id}, to=${to}`)
    
    const model = findModelById(context.models || [], id)
    if (model && model.object && context.gridCellSize) {
      const [gridX, gridZ] = to
      const cellSize = context.gridCellSize
      const targetX = (gridX + 0.5) * cellSize
      const targetZ = (gridZ + 0.5) * cellSize
      const targetY = model.object.position.y
      
      // 使用model.js的animateModelMove
      if (context.animateModelMove) {
        await new Promise(resolve => {
          context.animateModelMove(
            model,
            { x: targetX, y: targetY, z: targetZ },
            resolve
          )
        })
      }
    }
  })

  // display_can_move: 显示可移动状态（绿色圈圈）
  messageQueue.registerHandler('display_can_move', async (data, context) => {
    const { id, can_move } = data
    const canMove = can_move === 'true' || can_move === true
    console.log(`[Handler] display_can_move id=${id}, can_move=${canMove}`)
    
    // TODO: 在模型脚下添加/移除绿色圈圈指示器
    if (context.onDisplayCanMove) {
      context.onDisplayCanMove(id, canMove)
    }
  })

  // display_can_attack: 显示可攻击状态（红色圈圈）
  messageQueue.registerHandler('display_can_attack', async (data, context) => {
    const { id, can_attack } = data
    const canAttack = can_attack === 'true' || can_attack === true
    console.log(`[Handler] display_can_attack id=${id}, can_attack=${canAttack}`)
    
    // TODO: 在模型脚下添加/移除红色圈圈指示器
    if (context.onDisplayCanAttack) {
      context.onDisplayCanAttack(id, canAttack)
    }
  })

  // clear_state: 清除单位的所有状态
  messageQueue.registerHandler('clear_state', async (data, context) => {
    const { id } = data
    console.log(`[Handler] clear_state id=${id}`)
    
    if (context.onClearState) {
      context.onClearState(id)
    }
  })

  // animate_move: 视角移动到单位
  messageQueue.registerHandler('animate_move', async (data, context) => {
    const { id } = data
    console.log(`[Handler] animate_move id=${id}`)
    
    const model = findModelById(context.models || [], id)
    if (model && context.camera && context.controls && context.focusOnModel) {
      const focusData = context.focusOnModel(model.object, context.camera, context.controls)
      
      // 设置聚焦状态
      if (context.focusState) {
        context.focusState.focusPosition = focusData.focusPosition
        context.focusState.focusTarget = focusData.focusTarget
        context.focusState.lerpFactor = focusData.lerpFactor
      }
      
      // 等待聚焦完成
      await delay(1000)
    }
  })

  // animate_reset: 视角复位
  messageQueue.registerHandler('animate_reset', async (data, context) => {
    console.log(`[Handler] animate_reset`)
    
    if (context.camera && context.controls) {
      // 重置到默认视角
      const targetPos = { x: 0, y: 2, z: 5 }
      const targetLookAt = { x: 0, y: 0, z: 0 }
      
      if (context.focusState) {
        context.focusState.focusPosition = targetPos
        context.focusState.focusTarget = targetLookAt
        context.focusState.lerpFactor = 0.08
      }
      
      await delay(1000)
    }
  })

  // put_map_block: 放置地图块
  messageQueue.registerHandler('put_map_block', async (data, context) => {
    const { position } = data
    console.log(`[Handler] put_map_block at ${position}`)
    
    if (context.onPutMapBlock) {
      context.onPutMapBlock(position)
    }
  })

  // set_move_block: 设置地图块为可移动（绿色）
  messageQueue.registerHandler('set_move_block', async (data, context) => {
    const { position } = data
    console.log(`[Handler] set_move_block at ${position}`)
    
    if (context.onSetMoveBlock) {
      context.onSetMoveBlock(position)
    }
  })

  // set_attack_block: 设置地图块为可攻击（红色）
  messageQueue.registerHandler('set_attack_block', async (data, context) => {
    const { position } = data
    console.log(`[Handler] set_attack_block at ${position}`)
    
    if (context.onSetAttackBlock) {
      context.onSetAttackBlock(position)
    }
  })

  // clear_block: 清除地图块状态
  messageQueue.registerHandler('clear_block', async (data, context) => {
    const { position } = data
    console.log(`[Handler] clear_block at ${position}`)
    
    if (context.onClearBlock) {
      context.onClearBlock(position)
    }
  })

  console.log('[MessageQueue] 已注册所有消息处理器，共', messageQueue.handlers.size, '个')
  console.log('[MessageQueue] 已注册的处理器列表:', Array.from(messageQueue.handlers.keys()))
}

