///|
pub struct Equipment {
  equipment_base : EquipmentBase
  id : Int
} derive(Eq, ToJson)

///|
pub fn Equipment::new(equipment_base : EquipmentBase) -> Equipment {
  { equipment_base, id: @id.id_pool.get_id() }
}

///|
struct EquipmentBase {
  name : String
  description : String
  resource_url : String
  attribute : @attribute.Attribute
} derive(Eq, ToJson)

///|
pub let equipment_list : FixedArray[EquipmentBase] = [
  {
    name: "不稳定的欢乐扳手",
    description: "工匠特斯拉的早期实验品之一。其内部嵌入了“情绪感应核心”，使用者的心情越愉悦，它的工作效率就越不稳定。实验日志上写着：“今天它帮我修好了三盏灯，但也让我的咖啡机跳了一整天的踢踏舞。",
    resource_url: "/assets/equipment/wrench.webp",
    attribute: @attribute.Attribute::new(health=0, attack=5, defense=0, dodge=2),
  },
  {
    name: "锅盖君的绝对防御",
    description: "这并非制式装备，而是卫斯理在皇家厨房工作时获得的“馈赠”。在一次锅炉意外中，这口锅盖被注入了过量的“心源能量”，从此变得异常坚固。锅底还隐约可见一块焦黑的糖渍。",
    resource_url: "/assets/equipment/lid.webp",
    attribute: @attribute.Attribute::new(health=0, attack=0, defense=5, dodge=2),
  },
  {
    name: "万用齿轮口袋",
    description: "小卯的随身百宝袋。她声称“没有一个问题是扔出一个合适的齿轮解决不了的”。袋子里似乎连接着一个微小的亚空间，总能摸出点意想不到的小玩意儿，当然，偶尔也会摸出午饭吃剩的螺丝螺母。",
    resource_url: "/assets/equipment/gear_pocket.webp",
    attribute: @attribute.Attribute::new(health=0, attack=1, defense=1, dodge=1),
  },
  {
    name: "毛团的线团堡垒",
    description: "絮絮的移动家园。这些毛线来自王朝最柔软的“云羊”绒毛，并由她亲手混入导电铜丝编织而成。既提供了无与伦比的舒适感，也能在必要时释放静电，驱赶不怀好意的小型害虫。",
    resource_url: "/assets/equipment/line_fortress.webp",
    attribute: @attribute.Attribute::new(health=0, attack=0, defense=3, dodge=5),
  },
  {
    name: "流光溢彩的棱镜",
    description: "菲尼的私人收藏。据说是她从王朝大剧院的顶级聚光灯上“借”来的核心镜片。她时常对着它调整自己法术的光效配色，并声称“合适的打光能让胜利的戏剧性翻倍”。",
    resource_url: "/assets/equipment/prism.webp",
    attribute: @attribute.Attribute::new(
      health=0,
      attack=10,
      defense=0,
      dodge=3,
    ),
  },
  {
    name: "掘掘的幸运罗盘",
    description: "鼹鼠先生最珍视的物品。指针永远指向“地脉能量最活跃”的方向，据他说那就是宝藏的方向。尽管他十次有九次会挖到废弃水管，但他依然坚信这个罗盘是世界上最准确的。",
    resource_url: "/assets/equipment/compass.webp",
    attribute: @attribute.Attribute::new(
      health=0,
      attack=8,
      defense=0,
      dodge=10,
    ),
  },
  {
    name: "哨歌的共鸣笛",
    description: "园林司为啾啾特制的沟通工具。其特定的频率能与大多数机械鸟类单元产生共鸣。在和平年代，它用来指挥鸟群摆出欢迎阵型。现在，则用来召唤它们进行“协同作战”。",
    resource_url: "/assets/equipment/flute.webp",
    attribute: @attribute.Attribute::new(
      health=20,
      attack=0,
      defense=0,
      dodge=5,
    ),
  },
  {
    name: "书页的速记羽毛笔",
    description: "大书库配发给卷卷的辅助工具。它能自动记录周围的重要信息并归档。缺点是有点话痨，总爱在空白处添加大量无关紧要的脚注和个人评论。",
    resource_url: "/assets/equipment/quill_pen.webp",
    attribute: @attribute.Attribute::new(health=0, attack=0, defense=0, dodge=0),
  },
  {
    name: "钟摆的时之碎片",
    description: "在“大休眠”发生的那一瞬间，中心广场的钟楼核心崩裂出的碎片。格洛克找到了它，并声称碎片中封存着“丢失的一秒钟”。触摸它时，能感到一种奇异的迟滞感。",
    resource_url: "/assets/equipment/fragment.webp",
    attribute: @attribute.Attribute::new(
      health=10,
      attack=0,
      defense=0,
      dodge=5,
    ),
  },
  {
    name: "旋旋的舞会请柬",
    description: "上一次皇家舞会发给米洛的请柬。舞会因大休眠未能举行，但这张请柬却被米洛注入了对舞蹈的极致热情。它能使持有者的动作变得如舞蹈般优雅且难以预测。",
    resource_url: "/assets/equipment/invitation.webp",
    attribute: @attribute.Attribute::new(
      health=0,
      attack=0,
      defense=0,
      dodge=20,
    ),
  },
]

///|
pub let equipment_map : Map[String, EquipmentBase] = Map::from_iter(
  equipment_list.iter().map(fn(equipment) { (equipment.name, equipment) }),
)
