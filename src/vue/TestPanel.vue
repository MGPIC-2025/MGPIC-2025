<script setup>
import { ref } from "vue";
import { eventloop } from "../glue.js";

const emit = defineEmits(["enter-scene"]);

// 测试函数列表
const testFunctions = ref([
  {
    name: "简单移动",
    key: "test_simple_move",
    desc: "移动单位到(2,2)并改变朝向",
  },
  {
    name: "显示状态",
    key: "test_display_states",
    desc: "显示可移动和可攻击圈圈",
  },
  { name: "清除状态", key: "test_clear_states", desc: "清除所有状态指示器" },
  {
    name: "移除单位",
    key: "test_remove",
    desc: "移除ID为2的单位（带淡出动画）",
  },
  { name: "聚焦单位", key: "test_camera_control", desc: "相机聚焦到单位1" },
  { name: "复位视角", key: "test_camera_reset", desc: "相机复位到默认位置" },
  { name: "地图块", key: "test_blocks", desc: "放置并设置地图块状态" },
  { name: "完整序列", key: "test_sequence", desc: "演示完整的交互流程（8步）" },
  { 
    name: "🔄 回合结束", 
    key: "test_game_round_pass", 
    desc: "清除地块并恢复所有铜偶的可移动/攻击状态" 
  },
]);

// EventLoop测试用例
// 注意：铜偶的实际ID需要从set_copper消息中获取
const actualCopperIds = ref([]); // 存储实际的铜偶ID

const eventloopTests = ref([
  {
    name: "🎮 游戏开始",
    key: "on_game_start",
    desc: "⚠️ 必须先执行！初始化游戏并放置铜偶[1,2,3]",
    params: { ids: ["1", "2", "3"] },
    required: true,
  },
  {
    name: "🎯 点击铜偶",
    key: "on_click_copper",
    desc: "点击并高亮选中铜偶，显示状态信息",
    get params() {
      return { id: String(actualCopperIds.value[0] || "1") };
    },
  },
  {
    name: "🟢 开始移动",
    key: "on_move_start",
    desc: "显示绿色移动范围（可移动的地块）",
    get params() {
      return { id: String(actualCopperIds.value[0] || "1") };
    },
  },
  {
    name: "实施移动",
    key: "on_move_apply",
    desc: "移动到位置(3,3)",
    get params() {
      return {
        id: String(actualCopperIds.value[0] || "1"),
        position: { x: "3", y: "3" },
      };
    },
  },
  {
    name: "🔴 开始攻击",
    key: "on_attack_start",
    desc: "显示红色攻击范围（可攻击的敌人）",
    get params() {
      return { id: String(actualCopperIds.value[0] || "1") };
    },
  },
  {
    name: "⬜ 取消攻击",
    key: "on_attack_end",
    desc: "清除所有红色攻击范围地块",
    params: {},
  },
  {
    name: "实施攻击",
    key: "on_attack_apply",
    desc: "攻击位置(4,4)的目标",
    get params() {
      return {
        id: String(actualCopperIds.value[0] || "1"),
        position: { x: "4", y: "4" },
      };
    },
  },
  {
    name: "🔄 回合结束",
    key: "on_game_round_pass",
    desc: "清除所有地块，恢复所有铜偶状态",
    params: {},
  },
]);

const gameInitialized = ref(false);

const isOpen = ref(false);
const executing = ref(null);
const showCustom = ref(false);
const showEventloop = ref(false);

// 测试模式：'backend' 或 'eventloop'
const testMode = ref("eventloop"); // 默认EventLoop模式

// 自定义测试参数
const customParams = ref({
  moveId: 1,
  moveX: 0,
  moveZ: 0,
  rotateId: 1,
  rotateDir: "PositiveX",
  removeId: 2,
});

const directions = ["PositiveX", "NegativeX", "PositiveY", "NegativeY"];

async function runTest(testKey) {
  try {
    executing.value = testKey;
    console.log(`[TestPanel] 执行后端测试: ${testKey}`);

    // 动态导入后端编译的 main.js
    const backend = await import("../main.js");
    const testFunc = backend[testKey];

    if (testFunc && typeof testFunc === "function") {
      testFunc();
      console.log(`[TestPanel] 后端测试执行成功: ${testKey}`);
    } else {
      console.error(`[TestPanel] 后端测试函数不存在: ${testKey}`);
      console.log(
        "[TestPanel] 可用的后端函数:",
        Object.keys(backend).filter((k) => k.startsWith("test_"))
      );
    }
  } catch (error) {
    console.error(`[TestPanel] 后端测试执行失败:`, error);
    console.error("[TestPanel] 请确保已编译后端代码: moon build");
  } finally {
    setTimeout(() => {
      executing.value = null;
    }, 500);
  }
}

function togglePanel() {
  isOpen.value = !isOpen.value;
  showCustom.value = false;
}

function toggleCustom() {
  showCustom.value = !showCustom.value;
}

// 切换测试模式并通知TestScene
async function switchTestMode(mode) {
  testMode.value = mode;
  console.log(
    `[TestPanel] 切换到${mode === "backend" ? "后端测试" : "EventLoop测试"}模式`
  );

  // 通知TestScene切换模型显示
  const { messageQueue } = await import("../messageQueue.js");
  if (messageQueue.sceneContext?.setTestMode) {
    messageQueue.sceneContext.setTestMode(mode);
  }
}

async function runCustomMove() {
  try {
    executing.value = "custom_move";
    console.log(
      `[TestPanel] 自定义移动: ID=${customParams.value.moveId} 到 (${customParams.value.moveX}, ${customParams.value.moveZ})`
    );

    const backend = await import("../main.js");
    if (backend.move_to_xy) {
      // 使用单独的x, y参数版本
      backend.move_to_xy(
        customParams.value.moveId,
        customParams.value.moveX,
        customParams.value.moveZ
      );
      console.log("[TestPanel] 自定义移动命令已发送");
    } else {
      console.error("[TestPanel] move_to_xy 函数不存在");
    }
  } catch (error) {
    console.error("[TestPanel] 执行失败:", error);
  } finally {
    setTimeout(() => {
      executing.value = null;
    }, 500);
  }
}

async function runCustomRotate() {
  try {
    executing.value = "custom_rotate";
    console.log(
      `[TestPanel] 自定义旋转: ID=${customParams.value.rotateId} 方向=${customParams.value.rotateDir}`
    );

    const backend = await import("../main.js");
    if (backend.change_direction_str) {
      // 直接传递字符串
      backend.change_direction_str(
        customParams.value.rotateId,
        customParams.value.rotateDir
      );
      console.log("[TestPanel] 自定义旋转命令已发送");
    } else {
      console.error("[TestPanel] change_direction_str 函数不存在");
    }
  } catch (error) {
    console.error("[TestPanel] 执行失败:", error);
  } finally {
    setTimeout(() => {
      executing.value = null;
    }, 500);
  }
}

async function runCustomRemove() {
  try {
    executing.value = "custom_remove";
    console.log(`[TestPanel] 自定义移除: ID=${customParams.value.removeId}`);

    const backend = await import("../main.js");
    if (backend.remove_unit) {
      backend.remove_unit(customParams.value.removeId);
      console.log("[TestPanel] 自定义移除命令已发送");
    } else {
      console.error("[TestPanel] remove_unit 函数不存在");
    }
  } catch (error) {
    console.error("[TestPanel] 执行失败:", error);
  } finally {
    setTimeout(() => {
      executing.value = null;
    }, 500);
  }
}

function toggleEventloop() {
  showEventloop.value = !showEventloop.value;
  showCustom.value = false;
}

// 执行EventLoop测试
async function runEventloopTest(test) {
  try {
    executing.value = test.key;
    console.log(`[TestPanel] 执行EventLoop测试: ${test.name}`);

    // 检查是否需要先初始化游戏
    if (!gameInitialized.value && test.key !== "on_game_start") {
      console.warn('[TestPanel] ⚠️ 游戏未初始化，请先点击 "🎮 游戏开始"');
      alert('⚠️ 请先点击 "🎮 游戏开始" 按钮初始化游戏！');
      return;
    }

    // 如果是游戏开始，先初始化ID收集器
    if (test.key === "on_game_start") {
      window.__ACTUAL_COPPER_IDS__ = [];
      console.log("[TestPanel] ✅ 已初始化ID收集器");

      // 检查是否在3D场景中
      import("../messageQueue.js").then((module) => {
        const sceneContext = module.messageQueue.sceneContext;

        if (!sceneContext?.onSetCopper) {
          console.warn("[TestPanel] ⚠️ 当前不在3D场景中，模型不会显示");
          console.warn('[TestPanel] 💡 点击"🎮 进入3D场景"按钮查看3D效果');
        } else {
          console.log("[TestPanel] ✅ 已检测到3D场景，模型将正常创建");
        }
      });
    }

    // 构造消息格式，按照eventloop.mbt的要求
    const message = JSON.stringify({
      type: test.key,
      content: test.params,
    });

    console.log("[TestPanel] 发送消息:", message);

    // 如果是实施攻击，触发攻击特效
    if (test.key === "on_attack_apply") {
      // 从消息中提取攻击者ID和目标位置
      const attackerId = test.params.id;
      const targetPos = [
        parseInt(test.params.position.x),
        parseInt(test.params.position.y),
      ];

      // 调用攻击特效
      import("../messageQueue.js").then((module) => {
        const sceneContext = module.messageQueue.sceneContext;
        if (sceneContext?.createAttackEffect) {
          sceneContext.createAttackEffect(parseInt(attackerId), targetPos);
          console.log("[TestPanel] 💥 触发攻击特效");
        }
      });
    }

    // 调用eventloop
    await eventloop(message);

    // 标记游戏已初始化
    if (test.key === "on_game_start") {
      // eventloop已经调用，现在等待消息到达
      console.log("[TestPanel] ⏳ 等待游戏初始化完成...");

      // 先等待300ms让消息开始到达
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 然后轮询等待ID被捕获
      let attempts = 0;
      const maxAttempts = 100; // 最多额外等待10秒（应该足够了）
      while (attempts < maxAttempts) {
        if (
          window.__ACTUAL_COPPER_IDS__ &&
          window.__ACTUAL_COPPER_IDS__.length >= 3
        ) {
          console.log(`[TestPanel] 在第 ${attempts} 次尝试时捕获到ID`);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      console.log(`[TestPanel] 轮询结束，尝试次数: ${attempts}`);

      // 从全局变量中获取实际的铜偶ID
      if (
        window.__ACTUAL_COPPER_IDS__ &&
        window.__ACTUAL_COPPER_IDS__.length >= 3
      ) {
        actualCopperIds.value = [...window.__ACTUAL_COPPER_IDS__];
        console.log(
          "[TestPanel] ✅ 捕获到实际的铜偶ID:",
          actualCopperIds.value
        );
        gameInitialized.value = true;
        console.log("[TestPanel] ✅ 游戏已初始化，可以进行其他操作");
      } else {
        console.error("[TestPanel] ❌ 未能捕获铜偶ID！");
        console.log(
          "[TestPanel] 当前捕获的ID数量:",
          window.__ACTUAL_COPPER_IDS__?.length || 0
        );
        console.log("[TestPanel] ID内容:", window.__ACTUAL_COPPER_IDS__);
        console.error("[TestPanel] ⚠️ 这是一个严重错误，可能是：");
        console.error("[TestPanel]   1. 后端没有发送set_copper消息");
        console.error("[TestPanel]   2. messageQueue处理消息太慢");
        console.error(
          "[TestPanel]   3. 需要重新编译后端：moon build --target js"
        );
        console.error("[TestPanel] 💡 请检查上方日志：");
        console.error("[TestPanel]   - 是否看到 [App] 🔥 收到set_copper消息？");
        console.error(
          "[TestPanel]   - 是否看到 [Handler] set_copper at ... ？"
        );
        console.error(
          "[TestPanel]   - 如果都没有，说明后端未发送消息，需要重新编译"
        );

        // 不标记为已初始化
        gameInitialized.value = false;
        executing.value = null;

        alert("❌ 未能捕获铜偶ID！");
        return; // 提前返回，不继续
      }
    }

    console.log("[TestPanel] EventLoop测试执行成功");
  } catch (error) {
    console.error("[TestPanel] EventLoop测试失败:", error);
    console.error("[TestPanel] 错误详情:", error.message);
    console.error("[TestPanel] 当前使用的铜偶ID:", actualCopperIds.value);

    // 提供更友好的错误提示
    if (error.message && error.message.includes("panic")) {
      console.error(
        '[TestPanel] 💡 提示: 大部分操作需要先初始化游戏（点击"🎮 游戏开始"）'
      );
      if (actualCopperIds.value.length === 0) {
        console.error("[TestPanel] ⚠️ 未能捕获铜偶ID！请刷新页面重试");
        alert('⚠️ 未能捕获铜偶ID，请刷新页面后重新点击"🎮 游戏开始"');
      }
    }
  } finally {
    setTimeout(() => {
      executing.value = null;
    }, 500);
  }
}

// 自定义EventLoop参数
const customEventloopParams = ref({
  type: "on_click_copper",
  copperId: "", // 不设默认值，强制用户输入
  positionX: "3",
  positionY: "3",
  ids: "1,2,3",
});

// 自动填充实际铜偶ID
function fillActualCopperId() {
  if (actualCopperIds.value.length > 0) {
    customEventloopParams.value.copperId = String(actualCopperIds.value[0]);
  } else {
    alert('⚠️ 请先执行"🎮 游戏开始"来创建铜偶');
  }
}

const eventloopTypes = [
  "on_click_copper",
  "on_attack_start",
  "on_attack_end",
  "on_attack_apply",
  "on_move_start",
  "on_move_apply",
  "on_game_start",
  "on_game_round_pass",
];

// 执行自定义EventLoop
async function runCustomEventloop() {
  try {
    executing.value = "custom_eventloop";
    const type = customEventloopParams.value.type;
    let content = {};

    // 根据不同类型构造content
    switch (type) {
      case "on_click_copper":
      case "on_attack_start":
      case "on_move_start":
        content = { id: customEventloopParams.value.copperId };
        break;
      case "on_attack_end":
      case "on_game_round_pass":
        content = {};
        break;
      case "on_attack_apply":
      case "on_move_apply":
        content = {
          id: customEventloopParams.value.copperId,
          position: {
            x: customEventloopParams.value.positionX,
            y: customEventloopParams.value.positionY,
          },
        };
        break;
      case "on_game_start":
        content = {
          ids: customEventloopParams.value.ids
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
        };
        break;
    }

    const message = JSON.stringify({ type, content });
    console.log("[TestPanel] 自定义EventLoop:", message);

    await eventloop(message);
    console.log("[TestPanel] 自定义EventLoop执行成功");
  } catch (error) {
    console.error("[TestPanel] 自定义EventLoop失败:", error);
  } finally {
    setTimeout(() => {
      executing.value = null;
    }, 500);
  }
}
</script>

<template>
  <div class="test-panel" :class="{ 'test-panel--open': isOpen }">
    <button
      class="test-panel__toggle"
      @click="togglePanel"
      :title="isOpen ? '关闭测试面板' : '打开测试面板'"
    >
      {{ isOpen ? "✕" : "🧪" }}
    </button>

    <div v-if="isOpen" class="test-panel__content">
      <div class="test-panel__header">
        <h3>消息交互测试</h3>
        <p class="test-panel__subtitle">测试后端到前端的消息通信</p>
        <button
          class="test-panel__scene-btn"
          @click="emit('enter-scene')"
          style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        >
          🎮 进入3D场景 (查看模型效果)
        </button>
        <div class="test-panel__tabs">
          <button
            class="test-panel__tab"
            :class="{
              'test-panel__tab--active': !showCustom && !showEventloop,
            }"
            @click="
              showCustom = false;
              showEventloop = false;
              switchTestMode('backend');
            "
          >
            🧪 后端测试
          </button>
          <button
            class="test-panel__tab"
            :class="{ 'test-panel__tab--active': showEventloop }"
            @click="
              toggleEventloop();
              switchTestMode('eventloop');
            "
          >
            🎮 EventLoop
          </button>
          <button
            class="test-panel__tab"
            :class="{ 'test-panel__tab--active': showCustom }"
            @click="
              toggleCustom();
              switchTestMode('backend');
            "
          >
            ⚙️ 自定义
          </button>
        </div>
      </div>

      <!-- EventLoop测试 -->
      <div v-if="showEventloop" class="test-panel__list">
        <!-- 游戏状态提示 -->
        <div
          class="game-status"
          :class="{
            'game-status--initialized': gameInitialized,
            'game-status--initializing': executing === 'on_game_start',
          }"
        >
          <span class="game-status__icon">
            {{
              gameInitialized
                ? "✅"
                : executing === "on_game_start"
                ? "⏳"
                : "⚠️"
            }}
          </span>
          <span class="game-status__text">
            <template v-if="gameInitialized">
              游戏已初始化
              <span
                v-if="actualCopperIds.length > 0"
                style="opacity: 0.8; font-size: 0.9em"
              >
                (铜偶ID: {{ actualCopperIds.join(", ") }})
              </span>
            </template>
            <template v-else-if="executing === 'on_game_start'">
              正在初始化游戏...
            </template>
            <template v-else> 游戏未初始化 - 请先点击"🎮 游戏开始" </template>
          </span>
        </div>

        <button
          v-for="test in eventloopTests"
          :key="test.key"
          class="test-item"
          :class="{
            'test-item--executing': executing === test.key,
            'test-item--required': test.required,
            'test-item--disabled':
              !gameInitialized && test.key !== 'on_game_start',
          }"
          :disabled="
            executing === test.key ||
            (!gameInitialized && test.key !== 'on_game_start')
          "
          @click="runEventloopTest(test)"
        >
          <div class="test-item__name">{{ test.name }}</div>
          <div class="test-item__desc">{{ test.desc }}</div>
        </button>

        <!-- 自定义EventLoop -->
        <div class="custom-eventloop">
          <h4>自定义EventLoop调用</h4>

          <!-- 可用ID提示 -->
          <div v-if="actualCopperIds.length > 0" class="copper-ids-hint">
            💡 可用铜偶ID:
            <span
              v-for="(id, idx) in actualCopperIds"
              :key="id"
              class="copper-id-tag"
            >
              {{ id }}<span v-if="idx < actualCopperIds.length - 1">, </span>
            </span>
          </div>
          <div v-else class="copper-ids-hint warning">
            ⚠️ 未检测到铜偶，请先执行"🎮 游戏开始"
          </div>

          <div class="custom-inputs">
            <select v-model="customEventloopParams.type" class="custom-select">
              <option v-for="type in eventloopTypes" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
          </div>
          <div
            v-if="
              ['on_click_copper', 'on_attack_start', 'on_move_start'].includes(
                customEventloopParams.type
              )
            "
            class="custom-inputs"
          >
            <div style="display: flex; gap: 8px">
              <input
                v-model="customEventloopParams.copperId"
                placeholder="铜偶ID（使用上面显示的ID）"
                class="custom-input"
                style="flex: 1"
              />
              <button
                class="fill-id-btn"
                @click="fillActualCopperId"
                :disabled="actualCopperIds.length === 0"
                title="自动填充第一个铜偶的ID"
              >
                📋
              </button>
            </div>
          </div>
          <div
            v-if="
              ['on_attack_apply', 'on_move_apply'].includes(
                customEventloopParams.type
              )
            "
            class="custom-inputs"
          >
            <div style="display: flex; gap: 8px; margin-bottom: 8px">
              <input
                v-model="customEventloopParams.copperId"
                placeholder="铜偶ID（使用上面显示的ID）"
                class="custom-input"
                style="flex: 1"
              />
              <button
                class="fill-id-btn"
                @click="fillActualCopperId"
                :disabled="actualCopperIds.length === 0"
                title="自动填充第一个铜偶的ID"
              >
                📋
              </button>
            </div>
            <div style="display: flex; gap: 8px">
              <input
                v-model="customEventloopParams.positionX"
                placeholder="X坐标"
                class="custom-input"
              />
              <input
                v-model="customEventloopParams.positionY"
                placeholder="Y坐标"
                class="custom-input"
              />
            </div>
          </div>
          <div
            v-if="customEventloopParams.type === 'on_game_start'"
            class="custom-inputs"
          >
            <input
              v-model="customEventloopParams.ids"
              placeholder="IDs (逗号分隔, 如: 1,2,3)"
              class="custom-input"
            />
          </div>
          <button
            class="custom-btn"
            @click="runCustomEventloop"
            :disabled="executing"
          >
            发送
          </button>
        </div>
      </div>

      <!-- 自定义测试 -->
      <div v-else-if="showCustom" class="test-panel__custom">
        <!-- 移动 -->
        <div class="custom-group">
          <h4>移动单位</h4>
          <div class="custom-inputs">
            <input
              v-model.number="customParams.moveId"
              type="number"
              placeholder="单位ID"
              class="custom-input"
            />
            <input
              v-model.number="customParams.moveX"
              type="number"
              placeholder="X坐标"
              class="custom-input"
            />
            <input
              v-model.number="customParams.moveZ"
              type="number"
              placeholder="Z坐标"
              class="custom-input"
            />
            <button
              class="custom-btn"
              @click="runCustomMove"
              :disabled="executing"
            >
              移动
            </button>
          </div>
        </div>

        <!-- 旋转 -->
        <div class="custom-group">
          <h4>改变朝向</h4>
          <div class="custom-inputs">
            <input
              v-model.number="customParams.rotateId"
              type="number"
              placeholder="单位ID"
              class="custom-input"
            />
            <select v-model="customParams.rotateDir" class="custom-select">
              <option v-for="dir in directions" :key="dir" :value="dir">
                {{ dir }}
              </option>
            </select>
            <button
              class="custom-btn"
              @click="runCustomRotate"
              :disabled="executing"
            >
              旋转
            </button>
          </div>
        </div>

        <!-- 移除 -->
        <div class="custom-group">
          <h4>移除单位</h4>
          <div class="custom-inputs">
            <input
              v-model.number="customParams.removeId"
              type="number"
              placeholder="单位ID"
              class="custom-input"
            />
            <button
              class="custom-btn custom-btn--danger"
              @click="runCustomRemove"
              :disabled="executing"
            >
              移除
            </button>
          </div>
        </div>
      </div>

      <!-- 预设测试 -->
      <div v-else class="test-panel__list">
        <button
          v-for="test in testFunctions"
          :key="test.key"
          class="test-item"
          :class="{ 'test-item--executing': executing === test.key }"
          :disabled="executing === test.key"
          @click="runTest(test.key)"
        >
          <div class="test-item__name">{{ test.name }}</div>
          <div class="test-item__desc">{{ test.desc }}</div>
        </button>
      </div>

      <div class="test-panel__footer">
        <p v-if="showEventloop">
          💡 点击"🎮 游戏开始"后等待状态变为"✅ 游戏已初始化"
          <br />
          <small style="opacity: 0.7; color: rgba(255, 200, 100, 1)">
            ⚠️ 想看3D效果？点击上方"🎮 进入3D场景"按钮！
          </small>
        </p>
        <p v-else-if="showCustom">💡 在3D场景中：蓝色=ID:1，红色=ID:2</p>
        <p v-else>💡 提示：确保场景中已有模型ID=1和ID=2</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10002;
  pointer-events: auto;
}

.test-panel__toggle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #ff6b6b;
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-panel__toggle:hover {
  background: #ff5252;
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.5);
}

.test-panel__toggle:active {
  transform: scale(0.95);
}

.test-panel__content {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 340px;
  max-height: 70vh;
  background: rgba(43, 26, 17, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.test-panel__header {
  padding: 16px 18px;
  background: rgba(31, 19, 12, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.test-panel__header h3 {
  margin: 0 0 4px 0;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.test-panel__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.test-panel__list {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.test-panel__list::-webkit-scrollbar {
  width: 6px;
}

.test-panel__list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.test-panel__list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.test-item {
  background: rgba(58, 37, 25, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  color: #fff;
}

.test-item:hover:not(:disabled) {
  background: rgba(75, 46, 31, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateX(-2px);
}

.test-item:active:not(:disabled) {
  transform: translateX(-1px);
}

.test-item--executing {
  background: rgba(255, 107, 107, 0.3);
  border-color: #ff6b6b;
  pointer-events: none;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.test-item__name {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 4px;
}

.test-item__desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.3;
}

.test-panel__footer {
  padding: 10px 18px;
  background: rgba(31, 19, 12, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.test-panel__footer p {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 200, 100, 0.8);
  line-height: 1.4;
}

.test-panel__scene-btn {
  width: 100%;
  margin-top: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.test-panel__scene-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

.test-panel__scene-btn:active {
  transform: translateY(0);
}

.test-panel__custom-toggle {
  width: 100%;
  margin-top: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.test-panel__custom-toggle:hover {
  background: rgba(255, 255, 255, 0.15);
}

.test-panel__custom {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.custom-group {
  background: rgba(58, 37, 25, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px;
}

.custom-group h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #fff;
  font-weight: 700;
}

.custom-inputs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.custom-input,
.custom-select {
  flex: 1;
  min-width: 60px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
}

.custom-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.custom-btn {
  padding: 6px 16px;
  background: rgba(255, 107, 107, 0.8);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.custom-btn:hover:not(:disabled) {
  background: rgba(255, 107, 107, 1);
  transform: translateY(-1px);
}

.custom-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-btn--danger {
  background: rgba(220, 38, 38, 0.8);
}

.custom-btn--danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 1);
}

/* Tab按钮 */
.test-panel__tabs {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.test-panel__tab {
  flex: 1;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.test-panel__tab:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

.test-panel__tab--active {
  background: rgba(255, 107, 107, 0.6);
  border-color: rgba(255, 107, 107, 0.8);
  color: #fff;
}

.test-panel__tab--active:hover {
  background: rgba(255, 107, 107, 0.7);
}

/* 自定义EventLoop */
.custom-eventloop {
  background: rgba(58, 37, 25, 0.6);
  border: 1px solid rgba(255, 200, 100, 0.3);
  border-radius: 10px;
  padding: 12px;
  margin-top: 12px;
}

.custom-eventloop h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: rgba(255, 200, 100, 1);
  font-weight: 700;
}

.custom-eventloop .custom-inputs {
  margin-bottom: 8px;
}

/* 铜偶ID提示 */
.copper-ids-hint {
  background: rgba(102, 126, 234, 0.15);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 10px;
  font-size: 12px;
  color: rgba(200, 220, 255, 0.9);
}

.copper-ids-hint.warning {
  background: rgba(255, 193, 7, 0.15);
  border-color: rgba(255, 193, 7, 0.3);
  color: rgba(255, 223, 100, 1);
}

.copper-id-tag {
  display: inline-block;
  background: rgba(102, 126, 234, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  color: rgba(200, 220, 255, 1);
}

/* 填充ID按钮 */
.fill-id-btn {
  min-width: 36px;
  height: 36px;
  padding: 0;
  background: rgba(102, 126, 234, 0.3);
  border: 1px solid rgba(102, 126, 234, 0.5);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.fill-id-btn:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.5);
  transform: scale(1.05);
}

.fill-id-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 游戏状态提示 */
.game-status {
  background: rgba(220, 38, 38, 0.2);
  border: 1px solid rgba(220, 38, 38, 0.4);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #fff;
}

.game-status--initialized {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.4);
}

.game-status--initializing {
  background: rgba(250, 204, 21, 0.2);
  border-color: rgba(250, 204, 21, 0.4);
  animation: pulse-yellow 1.5s infinite;
}

@keyframes pulse-yellow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.game-status__icon {
  font-size: 16px;
}

.game-status__text {
  flex: 1;
  line-height: 1.4;
}

/* 必需测试项 */
.test-item--required {
  border: 2px solid rgba(255, 200, 100, 0.6);
  background: rgba(255, 200, 100, 0.1);
}

.test-item--required:hover:not(:disabled) {
  border-color: rgba(255, 200, 100, 0.8);
  background: rgba(255, 200, 100, 0.2);
}

/* 禁用状态 */
.test-item--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.test-item--disabled:hover {
  transform: none;
  background: rgba(58, 37, 25, 0.8);
}
</style>
