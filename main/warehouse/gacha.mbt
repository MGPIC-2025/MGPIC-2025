///|
fn summon_copper() -> @coppers.Copper {
  let id = @id.id_pool.get_id()
  let copper_info = @coppers.copper_info_list[@rand.summon_random_number(
      0,
      @coppers.copper_info_list.length() - 1,
    )]
  let default_attribute = @coppers.get_default_attribute(
    copper_info.copper_type,
  )
  @coppers.Copper::{
    id,
    level: 1,
    suffix: id,
    live_left: 5,
    attribute: default_attribute,
    copper_type: copper_info.copper_type,
    equipment_slot: @coppers.EquipmentSlot::new(),
    copper_info,
  }
}

///|
pub fn gacha(global : @global_resource.GlobalResource) -> @coppers.Copper? {
  if global.get_resource(@resource.SpiritalSpark) >= 10 {
    global.consume_resource(@resource.SpiritalSpark, 10)
    let copper = summon_copper()
    Some(copper)
  } else {
    @global_msg.msg_info.broadcast({
      type_msg: "resource_not_enough",
      content: "资源不足",
    })
    None
  }
}
