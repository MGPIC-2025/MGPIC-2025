import { setModelConfig } from './model.js';
import { getAssetUrl } from './utils/resourceLoader.js';

function initModel() {
  // 🗺️ 设置模型配置（示例）
  // 你可以为每个不同的模型文件设置不同的参数
  setModelConfig('variant', getAssetUrl('enemy/variant/variant.glb'), {
    initialX: 2, // 初始位置X = 2
    initialY: 2, // 初始位置Y = 0
    initialZ: 3, // 初始位置Z = -3
    initialScale: 4, // 初始缩放 = 1.5倍
    lightIntensity: 30.0, // 光源强度 = 2.0
    lightDistance: 10, // 光源距离 = 150
    lightColor: '#ffffffff', // 光源颜色 = 橙色
    lightPosX: 0.75, // 光源相对X位置 = 1.0
    lightPosY: 0, // 光源相对Y位置 = 0.5
    lightPosZ: 0, // 光源相对Z位置 = 0.5
  });

  setModelConfig('bubble', getAssetUrl('copper/arcanist/bubble/bubble.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 50.0, // 光源强度
    lightDistance: 5, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('glimmer', getAssetUrl('copper/arcanist/glimmer/glimmer.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('spark', getAssetUrl('copper/arcanist/spark/spark.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('syrup', getAssetUrl('copper/arcanist/syrup/syrup.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('turner', getAssetUrl('copper/arcanist/turner/turner.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('artifex', getAssetUrl('copper/craftsman/artifex/artifex.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('coil', getAssetUrl('copper/craftsman/coil/coil.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig(
    'drillbit',
    getAssetUrl('copper/craftsman/dirllbit/drillbit.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig(
    'quickhand',
    getAssetUrl('copper/craftsman/quickhand/quickhand.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig('wrench', getAssetUrl('copper/craftsman/wrench/wrench.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('bell', getAssetUrl('copper/iron_wall/bell/bell.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('chief', getAssetUrl('copper/iron_wall/chief/chief.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('rocky', getAssetUrl('copper/iron_wall/rocky/rocky.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 15.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('tumble', getAssetUrl('copper/iron_wall/tumble/tumble.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('wesley', getAssetUrl('copper/iron_wall/wesley/wesley.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('gyro', getAssetUrl('copper/mechanic/gyro/gyro.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('karin', getAssetUrl('copper/mechanic/karin/karin.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('pendulum', getAssetUrl('copper/mechanic/pendulum/pendulum.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('tricky', getAssetUrl('copper/mechanic/tricky/tricky.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 10.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('yoyo', getAssetUrl('copper/mechanic/yoyo/yoyo.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 15.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig(
    'clawster',
    getAssetUrl('copper/resonator/clawster/clawster.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig('diggs', getAssetUrl('copper/resonator/diggs/diggs.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('hive', getAssetUrl('copper/resonator/hive/hive.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('melody', getAssetUrl('copper/resonator/melody/melody.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('murmur', getAssetUrl('copper/resonator/murmur/murmur.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('assassin', getAssetUrl('enemy/assassin/assassin.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig('boxer', getAssetUrl('enemy/boxer/boxer.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });
  setModelConfig('cruiser', getAssetUrl('enemy/cruiser/cruiser.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });
  setModelConfig('demon', getAssetUrl('enemy/demon/demon.glb'), {
    initialX: 0, // 初始位置X
    initialY: 2, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 4, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });
  setModelConfig('devourer', getAssetUrl('enemy/devourer/devourer.glb'), {
    initialX: 0, // 初始位置X
    initialY: 1.5, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 3, // 初始缩放(固定)
    lightIntensity: 25.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });
  setModelConfig('glutton', getAssetUrl('enemy/glutton/glutton.glb'), {
    initialX: 0, // 初始位置X
    initialY: 2, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 4, // 初始缩放(固定)
    lightIntensity: 35.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });
  setModelConfig('goblin', getAssetUrl('enemy/goblin/goblin.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.5, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });
  setModelConfig('guard', getAssetUrl('enemy/guard/guard.glb'), {
    initialX: 0, // 初始位置X
    initialY: 1, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 2, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });
  setModelConfig('horn', getAssetUrl('enemy/horn/horn.glb'), {
    initialX: 0, // 初始位置X
    initialY: 1, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 2, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });
  setModelConfig('mirror', getAssetUrl('enemy/mirror/mirror.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 25.0, // 光源强度
    lightDistance: 5, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0.5, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });
  setModelConfig('scout', getAssetUrl('enemy/scout/scout.glb'), {
    initialX: 0, // 初始位置X
    initialY: 0.75, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 1.5, // 初始缩放(固定)
    lightIntensity: 5.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });
  setModelConfig('shatra', getAssetUrl('enemy/shatra/shatra.glb'), {
    initialX: 0, // 初始位置X
    initialY: 1.25, // 初始位置Y(固定)
    initialZ: 0, // 初始位置Z
    initialScale: 2.5, // 初始缩放(固定)
    lightIntensity: 35.0, // 光源强度
    lightDistance: 10, // 光源距离
    lightColor: '#ffffffff', // 光源颜色
    lightPosX: 1, // 光源相对X位置
    lightPosY: 0, // 光源相对Y位置
    lightPosZ: 0, // 光源相对Z位置
  });

  setModelConfig(
    'automatic_loading_gun',
    getAssetUrl('structure/automatic_loading_gun/automatic_loading_gun.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig(
    'charging_coil',
    getAssetUrl('structure/charging_coil/charging_coil.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 2.5, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig(
    'heart_source_mineral_drill',
    getAssetUrl('structure/heart_source_mineral_drill/heart_source_mineral_drill.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig(
    'mirro_light_refraction_tower',
    getAssetUrl('structure/mirro_light_refraction_tower/mirro_light_refraction_tower.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig(
    'repair_workshop',
    getAssetUrl('structure/repair_workshop/repair_workshop.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig(
    'resonance_alarm_bell',
    getAssetUrl('structure/resonance_alarm_bell/resonance_alarm_bell.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig(
    'rivet_barrier',
    getAssetUrl('structure/rivet_barrier/rivet_barrier.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig(
    'steam_mining_car',
    getAssetUrl('structure/steam_mining_car/steam_mining_car.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );

  setModelConfig(
    'storm_anvil',
    getAssetUrl('structure/storm_anvil/storm_anvil.glb'),
    {
      initialX: 0, // 初始位置X
      initialY: 0.75, // 初始位置Y(固定)
      initialZ: 0, // 初始位置Z
      initialScale: 1.5, // 初始缩放(固定)
      lightIntensity: 5.0, // 光源强度
      lightDistance: 10, // 光源距离
      lightColor: '#ffffffff', // 光源颜色
      lightPosX: 1, // 光源相对X位置
      lightPosY: 0, // 光源相对Y位置
      lightPosZ: 0, // 光源相对Z位置
    }
  );
}

export { initModel };
