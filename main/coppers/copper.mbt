///|
pub(all) struct Copper {
  id : Int
  level : Int
  suffix : Int
  mut live_left : Int
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
  attack_range : Int?
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
