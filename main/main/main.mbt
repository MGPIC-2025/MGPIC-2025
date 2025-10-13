///|
pub typealias @global.Global

///|
pub typealias @global_msg.GlobalInfo

///|
pub fn get_global() -> @global.Global {
  @global.global
}

///|
pub fn get_global_info() -> @global_msg.GlobalInfo {
  @global_msg.msg_info
}

///|
pub fn global_get_resource(global : @global.Global) -> Json {
  global.get_resource()
}

///|
pub fn global_get_copper_list(global : @global.Global) -> Json {
  global.get_copper_list()
}

///|
pub fn global_gacha(global : @global.Global) -> Json {
  global.gacha()
}

///|
pub fn global_info_subscribe(
  global_info : @global_msg.GlobalInfo,
  callback : (Json) -> Unit,
) -> Unit {
  global_info.subscribe(fn(information : @global_msg.Information) -> Unit {
    callback(information.to_json())
  })
}
