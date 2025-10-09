///|
pub(all) struct Copper {
  id : Int
  level : Int
  suffix : Int
  live_left : Int
  attribute : @attribute.Attribute
  copper_type : CopperType
  equipment_slot : EquipmentSlot
  copper_info : CopperInfo
}

///|
pub struct CopperInfo {
  name : String
  copper_type : CopperType
  description : String
  icon_url : String
  model_url : String
  skill : Skill?
}
