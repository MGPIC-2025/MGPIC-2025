///|
let enemy_list : Array[EnemyBase] = [
  {
    level: 1,
    health: 30,
    attack: 5,
    defense: 0,
    dodge: 0,
    attack_range: 1,
    move_range: 2,
    name: "哥布林",
    enemy_type: "goblin",
    description: "哥布林并非铜曜王朝的原生种族，而是一群在王朝崩溃后，趁机潜入地牢的'拾荒者'。它们对心源科技一知半解，但天生对机械有着诡异的亲和力，擅长拆解、偷窃和利用废墟中的一切。它们不是最强大的敌人，但非常狡猾，会设置陷阱、偷走玩家的临时增益，或是呼叫同伴。击败它们有时能获得一些意想不到的小玩意和零件。",
    asset_url: "/assets/enemy/goblin/goblin.webp",
    model_url: "/assets/enemy/goblin/goblin.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=1), 0.5),
      (Item::new(Resource(RefinedCopper), count=2), 0.6),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["书页的速记羽毛笔"],
            ),
          ),
        ),
        0.05,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 1,
    health: 100,
    attack: 20,
    defense: 5,
    dodge: 10,
    attack_range: 1,
    move_range: 1,
    name: "锈蚀巡游者",
    enemy_type: "cruiser",
    description: "曾是王城负责除锈保养的工役，核心程序错乱后，反而开始传播锈蚀。它们是地牢中最常见的退化力量。",
    asset_url: "/assets/enemy/cruiser/cruiser.webp",
    model_url: "/assets/enemy/cruiser/cruiser.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=2), 0.7),
      (Item::new(Resource(RefinedCopper), count=1), 0.5),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["万用齿轮口袋"],
            ),
          ),
        ),
        0.06,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 2,
    health: 40,
    attack: 5,
    defense: 3,
    dodge: 0,
    attack_range: 1,
    move_range: 2,
    name: "齿轮斥候",
    enemy_type: "scout",
    description: "朝军队用来巡逻和送信的自动机械犬。失控后，它们依然在漫无目的地'巡逻'，并将任何移动单位视为入侵者。",
    asset_url: "/assets/enemy/scout/scout.webp",
    model_url: "/assets/enemy/scout/scout.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=2), 0.6),
      (Item::new(Resource(RefinedCopper), count=2), 0.7),
      (Item::new(Resource(RecallGear), count=1), 0.2),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["不稳定的欢乐扳手"],
            ),
          ),
        ),
        0.08,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 3,
    health: 200,
    attack: 30,
    defense: 20,
    dodge: 0,
    attack_range: 1,
    move_range: 1,
    name: "蒸汽拳手",
    enemy_type: "boxer",
    description: " 矿区使用的重型劳工铜偶，拥有惊人的力量。现在，它们只会重复最简单的指令：用蒸汽动力重拳粉碎眼前的障碍。",
    asset_url: "/assets/enemy/boxer/boxer.webp",
    model_url: "/assets/enemy/boxer/boxer.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=3), 0.8),
      (Item::new(Resource(RefinedCopper), count=3), 0.8),
      (Item::new(Resource(RecallGear), count=1), 0.3),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["锅盖君的绝对防御"],
            ),
          ),
        ),
        0.10,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 2,
    health: 10,
    attack: 20,
    defense: 5,
    dodge: 0,
    attack_range: 3,
    move_range: 1,
    name: "管风琴号手",
    enemy_type: "horn",
    description: "皇家乐团的自动乐器成员之一，原本奏响庄严乐章。如今，它的乐曲变成了撕裂耳膜、扰乱心智的噪音攻击。",
    asset_url: "/assets/enemy/horn/horn.webp",
    model_url: "/assets/enemy/horn/horn.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=2), 0.7),
      (Item::new(Resource(ResonantCrystal), count=1), 0.4),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["哨歌的共鸣笛"],
            ),
          ),
        ),
        0.07,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 2,
    health: 20,
    attack: 50,
    defense: 0,
    dodge: 20,
    attack_range: 1,
    move_range: 2,
    name: "发条刺客",
    enemy_type: "assassin",
    description: "阴影中的守护者，负责处理见不得光的威胁。程序失控后，它们的刺杀名单上写满了所有活物。",
    asset_url: "/assets/enemy/assassin/assassin.webp",
    model_url: "/assets/enemy/assassin/assassin.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=2), 0.7),
      (Item::new(Resource(RefinedCopper), count=2), 0.6),
      (Item::new(Resource(RecallGear), count=1), 0.4),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["毛团的线团堡垒"],
            ),
          ),
        ),
        0.08,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 5,
    health: 300,
    attack: 10,
    defense: 20,
    dodge: 0,
    attack_range: 1,
    move_range: 1,
    name: "锅炉吞噬者",
    enemy_type: "devourer",
    description: "地牢的能量回收单元，负责将废弃物转化为蒸汽动力。如今它变得无比贪婪，会主动吞噬任何金属物体，包括掉队的铜偶。",
    asset_url: "/assets/enemy/devourer/devourer.glb",
    model_url: "/assets/enemy/devourer/devourer.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=4), 0.85),
      (Item::new(Resource(RefinedCopper), count=4), 0.8),
      (Item::new(Resource(RecallGear), count=2), 0.5),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["钟摆的时之碎片"],
            ),
          ),
        ),
        0.12,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 6,
    health: 20,
    attack: 80,
    defense: 0,
    dodge: 0,
    attack_range: 2,
    move_range: 1,
    name: "镜面编织者",
    enemy_type: "mirror",
    description: "用于宫廷娱乐和谜题守护的精密造物。它能创造以假乱真的幻象来迷惑入侵者，本身十分脆弱，但极难被真正触及。",
    asset_url: "/assets/enemy/mirror/mirror.webp",
    model_url: "/assets/enemy/mirror/mirror.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=3), 0.8),
      (Item::new(Resource(ResonantCrystal), count=2), 0.6),
      (Item::new(Resource(RecallGear), count=1), 0.5),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["流光溢彩的棱镜"],
            ),
          ),
        ),
        0.15,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 7,
    health: 150,
    attack: 30,
    defense: 20,
    dodge: 10,
    attack_range: 1,
    move_range: 1,
    name: "巨锤守卫",
    enemy_type: "guard",
    description: "王城宝库和重要大门的守卫者。即使失控，它们依然固守着生前的位置，用最纯粹的力量碾碎一切未经许可的靠近者。",
    asset_url: "/assets/enemy/guard/guard.webp",
    model_url: "/assets/enemy/guard/guard.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=4), 0.9),
      (Item::new(Resource(RefinedCopper), count=5), 0.85),
      (Item::new(Resource(RecallGear), count=2), 0.6),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["锅盖君的绝对防御"],
            ),
          ),
        ),
        0.15,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 8,
    health: 50,
    attack: 30,
    defense: 5,
    dodge: 0,
    attack_range: 5,
    move_range: 1,
    name: "差分机妖",
    enemy_type: "demon",
    description: "王朝计算中心的智能核心碎片，拥有强大的逻辑运算能力。它将战斗视为一场需要'计算'和'优化'的数学问题，是极其难缠的精英敌人。",
    asset_url: "/assets/enemy/demon/demon.webp",
    model_url: "/assets/enemy/demon/demon.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=5), 0.9),
      (Item::new(Resource(ResonantCrystal), count=3), 0.75),
      (Item::new(Resource(RecallGear), count=2), 0.7),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["掘掘的幸运罗盘"],
            ),
          ),
        ),
        0.18,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 9,
    health: 200,
    attack: 40,
    defense: 20,
    dodge: 0,
    attack_range: 1,
    move_range: 1,
    name: "心源畸变体",
    enemy_type: "variant",
    description: "它曾是王朝庆典的中央娱乐单元——'欢宴主脑'。大休眠时，过量的心源能量没有摧毁它，反而让它陷入了永久的、失控的狂喜状态。它将地牢变成了它个人的派对现场，并'热情'地邀请（或者说强迫）所有闯入者加入它混乱的欢宴。它会用五彩的声光、抛洒的零件和看似可爱实则威力巨大的玩具进行攻击。击败它，就是终结这场永无止境的噪音派对。",
    asset_url: "/assets/enemy/variant/variant.webp",
    model_url: "/assets/enemy/variant/variant.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=6), 0.95),
      (Item::new(Resource(RefinedCopper), count=5), 0.85),
      (Item::new(Resource(ResonantCrystal), count=3), 0.8),
      (Item::new(Resource(RecallGear), count=3), 0.75),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["旋旋的舞会请柬"],
            ),
          ),
        ),
        0.20,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 11,
    health: 1000,
    attack: 80,
    defense: 50,
    dodge: 0,
    attack_range: 1,
    move_range: 1,
    name: "（BOSS）织网夫人·夏特拉",
    enemy_type: "shatra",
    description: "夏特拉曾是王朝的'信息架构师'，负责维护整个王城的心源能量网络。大休眠发生时，她为了稳定网络，选择将自己的核心与主控终端永久连接。数百年的孤独守护和能量侵蚀让她变得偏执，她认为任何外来者都是不稳定的'病毒'，会破坏她精心维持的、死寂的'平衡'。她会操纵整个地牢的机关和能量流来攻击玩家，将玩家视为需要清除的系统威胁。",
    asset_url: "/assets/enemy/shatra/shatra.webp",
    model_url: "/assets/enemy/shatra/shatra.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=15), 1.0),
      (Item::new(Resource(RefinedCopper), count=10), 1.0),
      (Item::new(Resource(ResonantCrystal), count=8), 1.0),
      (Item::new(Resource(RecallGear), count=5), 1.0),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["流光溢彩的棱镜"],
            ),
          ),
        ),
        0.60,
      ),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["掘掘的幸运罗盘"],
            ),
          ),
        ),
        0.50,
      ),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["旋旋的舞会请柬"],
            ),
          ),
        ),
        0.50,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
  {
    level: 11,
    health: 3000,
    attack: 50,
    defense: 50,
    dodge: 0,
    attack_range: 1,
    move_range: 1,
    name: "（BOSS）废械吞噬者·饕餮",
    enemy_type: "glutton",
    description: "它不是被制造的，而是'生长'出来的。在王朝崩溃的废墟中，一个简单的'垃圾处理'核心程序发生了可怕的变异，它开始主动吞噬遇到的一切机械体，并将它们的功能和结构粗暴地整合到自己身上。它代表着纯粹的、无意识的毁灭与贪婪，是地牢中会移动的天灾。击败它需要攻击其身上不断变化的弱点核心。",
    asset_url: "/assets/enemy/glutton/glutton.webp",
    model_url: "/assets/enemy/glutton/glutton.glb",
    drop_items: [
      (Item::new(Resource(HeartCrystalDust), count=20), 1.0),
      (Item::new(Resource(RefinedCopper), count=15), 1.0),
      (Item::new(Resource(ResonantCrystal), count=10), 1.0),
      (Item::new(Resource(RecallGear), count=8), 1.0),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["不稳定的欢乐扳手"],
            ),
          ),
        ),
        0.40,
      ),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["锅盖君的绝对防御"],
            ),
          ),
        ),
        0.40,
      ),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["哨歌的共鸣笛"],
            ),
          ),
        ),
        0.40,
      ),
      (
        Item::new(
          Equipment(
            @equipment.Equipment::new(
              @equipment.equipment_map["钟摆的时之碎片"],
            ),
          ),
        ),
        0.40,
      ),
    ],
    summon_cost: @resource.ResourceCost::new([(@resource.SpiritalSpark, 1)]),
  },
]

///|
let enemy_info_map : Map[String, EnemyBase] = Map::from_iter(
  enemy_list.iter().map(enemy => (enemy.name, enemy)),
)
