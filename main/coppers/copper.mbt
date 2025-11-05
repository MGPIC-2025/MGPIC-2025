///|
pub(all) struct Copper {
  id : Int
  level : Int
  suffix : Int
  mut live_left : Int  // 可变字段，用于召唤物生命周期管理
  mut attribute : @attribute.Attribute
  copper_type : CopperType
  mut equipment_slot : EquipmentSlot
  copper_info : CopperInfo
} derive(ToJson)

///|
pub struct CopperInfo {
  name : String
  copper_type : CopperType
  description : String
  icon_url : String
  model_url : String
  skill : Skill?
  attack_range : Int? // 可选：召唤物的攻击范围（如果为 None，则使用类型默认值）
} derive(ToJson)

///|
pub fn summon_copper_from_info(name : String) -> Copper {
  let copper_info = copper_info_map[name]
  let id = @id.id_pool.get_id()
  Copper::{
    id,
    level: 1,
    suffix: id,
    live_left: 5,
    attribute: get_default_attribute(copper_info.copper_type),
    copper_type: copper_info.copper_type,
    equipment_slot: EquipmentSlot::new(),
    copper_info,
  }
}

///|
/// 从敌人信息创建召唤铜偶（使用敌人的外观和属性，但作为铜偶逻辑）
pub fn create_summoned_copper_from_enemy(
  enemy_name : String,
  _enemy_type : String,
  enemy_description : String,
  enemy_model_url : String,
  enemy_icon_url : String,
  health : Float,
  attack : Float,
  defense : Float,
  dodge : Float,
  attack_range : Int,
) -> Copper {
  let id = @id.id_pool.get_id()
  
  // 根据攻击范围决定铜偶类型（近战=IronWall，远程=Arcanist）
  // 这样召唤物只能攻击敌人，不会治疗友方
  let copper_type = if attack_range <= 1 {
    IronWall // 近战单位
  } else {
    Arcanist // 远程单位
  }
  
  // 创建召唤铜偶的 CopperInfo（使用敌人的外观信息）
  let copper_info : CopperInfo = {
    name: enemy_name,
    copper_type,
    description: enemy_description,
    icon_url: enemy_icon_url,
    model_url: enemy_model_url,
    skill: None, // 召唤物没有技能
    attack_range: Some(attack_range), // 使用敌人的原始攻击范围
  }
  
  // 创建基于敌人属性的 Attribute
  let attribute = @attribute.Attribute::new(
    health~,
    attack~,
    defense~,
    dodge~,
  )
  
  Copper::{
    id,
    level: 1,
    suffix: id,
    live_left: 2, // 召唤物只能存活2回合（或根据需要调整）
    attribute,
    copper_type,
    equipment_slot: EquipmentSlot::new(),
    copper_info,
  }
}