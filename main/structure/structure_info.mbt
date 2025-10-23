///|
let structure_info_list : FixedArray[StructureBase] = [
  {
    name: "铆接壁垒",
    health: 500,
    description: " 一段坚固的、由巨大黄铜板铆接而成的城墙，板上有蒸汽管道加固。墙头有齿轮驱动的可动挡板，墙体内嵌有发出稳定黄光的观察灯。",
    asset_url: "assets/structure/riveted_barrier/riveted_barrier.webp",
    model_url: "assets/structure/riveted_barrier/riveted_barrier.glb",
    cost: @resource.ResourceCost::new([(@resource.RefinedCopper, 10)]),
  },
  {
    name: "齿轮箭塔",
    health: 200,
    description: "一座细高的塔楼，顶部是一个开放式齿轮组平台，通过传送带将铜质弩箭自动上弦并连续发射。塔身有蒸汽泄压阀，每次齐射都伴随“嘶嘶”声。",
    asset_url: "assets/structure/gear_arrow_tower/gear_arrow_tower.webp",
    model_url: "assets/structure/gear_arrow_tower/gear_arrow_tower.glb",
    cost: @resource.ResourceCost::new([(@resource.RefinedCopper, 10)]),
  },
  {
    name: "心源矿钻",
    health: 300,
    description: "一台顶部装有巨大钻头的大型钻井装置，由复杂的齿轮组和活塞驱动。钻头高速旋转，闪烁着蓝光，从地底带出发光的矿石。",
    asset_url: "assets/structure/heart_source_drill/heart_source_mineral_drill.webp",
    model_url: "assets/structure/heart_source_drill/heart_source_mineral_drill.glb",
    cost: @resource.ResourceCost::new([
      (@resource.RefinedCopper, 15),
      (@resource.HeartCrystalDust, 5),
    ]),
  },
  {
    name: "蒸汽矿车",
    health: 100,
    description: "一辆小巧但结实的黄铜矿车，车头有一个微型锅炉和烟囱，噗噗地喷着蒸汽。车厢用于装载矿石，通过预设的轨道自动往返于矿场和基地。",
    asset_url: "assets/structure/steam_mineral_car/steam_mineral_car.webp",
    model_url: "assets/structure/steam_mineral_car/steam_mineral_car.glb",
    cost: @resource.ResourceCost::new([(@resource.RefinedCopper, 8)]),
  },
  {
    name: "充能线圈",
    health: 1000,
    description: "一个由巨大铜线圈缠绕而成的塔状建筑，线圈中央有电弧在不断跳跃。它能够为周围一定范围内的友方建筑提供能量，使其运作更快。",
    asset_url: "assets/structure/charging_coil/charging_coil.webp",
    model_url: "assets/structure/charging_coil/charging_coil.glb",
    cost: @resource.ResourceCost::new([
      (@resource.RefinedCopper, 20),
      (@resource.ResonantCrystal, 3),
    ]),
  },
  {
    name: "维修工坊",
    health: 300,
    description: "一个带有可开合顶棚的圆形工坊，内部有多个机械臂。友方铜偶经过时，机械臂会自动为其进行修复和保养，发出叮叮当当的敲打声。",
    asset_url: "assets/structure/repair_workshop/repair_workshop.webp",
    model_url: "assets/structure/repair_workshop/repair_workshop.glb",
    cost: @resource.ResourceCost::new([
      (@resource.RefinedCopper, 12),
      (@resource.RecallGear, 2),
    ]),
  },
  {
    name: "镜光折射塔",
    health: 3000,
    description: "一座顶部镶嵌着巨大、可转动水晶镜片的塔。它能聚集环境中的心源能量，发射出一道灼热的折射光束，对直线上的敌人造成伤害。",
    asset_url: "assets/structure/mirror_refractory_tower/mirror_light_refraction_tower.webp",
    model_url: "assets/structure/mirror_refractory_tower/mirror_light_refraction_tower.glb",
    cost: @resource.ResourceCost::new([
      (@resource.RefinedCopper, 25),
      (@resource.ResonantCrystal, 8),
      (@resource.HeartCrystalDust, 10),
    ]),
  },
  {
    name: "共鸣警钟",
    health: 300,
    description: "一个悬挂在精致黄铜钟楼里的大钟，钟体刻有共鸣符文。当敌人靠近时，它会自动鸣响，发出可见的声波涟漪，短暂暴露周围隐形单位并使其眩晕。",
    asset_url: "assets/structure/resonance_alarm_bell/resonance_alarm_bell.webp",
    model_url: "assets/structure/resonance_alarm_bell/resonance_alarm_bell.glb",
    cost: @resource.ResourceCost::new([
      (@resource.RefinedCopper, 15),
      (@resource.ResonantCrystal, 5),
    ]),
  },
  {
    name: "风暴铁砧",
    health: 500,
    description: "一个被闪电线圈环绕的巨大铁砧。它会定期引动空气中的能量，召唤一道小范围的闪电风暴，轰击区域内的所有敌人。",
    asset_url: "assets/structure/storm_iron_anvil/storm_anvil.webp",
    model_url: "assets/structure/storm_iron_anvil/storm_anvil.glb",
    cost: @resource.ResourceCost::new([
      (@resource.RefinedCopper, 18),
      (@resource.SpiritalSpark, 3),
    ]),
  },
]

///|
pub let structure_map : Map[String, StructureBase] = Map::from_iter(
  structure_info_list
  .iter()
  .map(structure_info => (structure_info.name, structure_info)),
)
