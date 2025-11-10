///|
pub fn global_get_bag() -> String {
  @global.global.val.get_bag()
}

///|
pub fn global_get_resource() -> String {
  @global.global.val.get_resource()
}

///|
pub fn global_craft() -> String {
  @global.global.val.craft()
}

///|
pub fn global_get_copper_list() -> String {
  @global.global.val.get_copper_list()
}

///|
pub fn global_gacha() -> String {
  @global.global.val.gacha()
}

///|
pub fn global_upgrade_copper(id : Int) -> String {
  @global.global.val.upgrade_copper(id)
}

///|
pub fn global_info_subscribe(callback : (String) -> Unit) -> Unit {
  @global_msg.msg_info.subscribe(callback)
}

///|
pub fn global_import_save(save : String) -> Unit {
  @save.import_save(save)
}

///|
pub fn global_export_save() -> String {
  @save.export_save()
}
