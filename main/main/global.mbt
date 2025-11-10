///|
pub fn global_get_bag() -> String {
  @global.global.get_bag()
}

///|
pub fn global_get_resource() -> String {
  @global.global.get_resource()
}

///|
pub fn global_craft() -> String {
  @global.global.craft()
}

///|
pub fn global_get_copper_list() -> String {
  @global.global.get_copper_list()
}

///|
pub fn global_gacha() -> String {
  @global.global.gacha()
}

///|
pub fn global_upgrade_copper(id : Int) -> String {
  @global.global.upgrade_copper(id)
}

///|
pub fn global_info_subscribe(callback : (String) -> Unit) -> Unit {
  @global_msg.msg_info.subscribe(callback)
}
