///|
pub fn global_get_resource() -> String {
  @global.global.get_resource()
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

///|
/// 测试函数导出
pub fn test_simple_move() -> Unit {
  @game.test_simple_move()
}

///|
pub fn test_display_states() -> Unit {
  @game.test_display_states()
}

///|
pub fn test_clear_states() -> Unit {
  @game.test_clear_states()
}

///|
pub fn test_remove() -> Unit {
  @game.test_remove()
}

///|
pub fn test_camera_control() -> Unit {
  @game.test_camera_control()
}

///|
pub fn test_camera_reset() -> Unit {
  @game.test_camera_reset()
}

///|
pub fn test_blocks() -> Unit {
  @game.test_blocks()
}

///|
pub fn test_sequence() -> Unit {
  @game.test_sequence()
}

///|
/// 自定义测试API：移动单位到指定位置
pub fn move_to(id : Int, to : (Int, Int)) -> Unit {
  @game.move_to(id, to)
}

///|
/// 自定义测试API：移动单位到指定位置（分离参数版本，供JavaScript调用）
pub fn move_to_xy(id : Int, x : Int, y : Int) -> Unit {
  @game.move_to(id, (x, y))
}

///|
/// 自定义测试API：改变单位朝向（接受字符串）
pub fn change_direction_str(id : Int, direction : String) -> Unit {
  // 直接发送消息，不使用枚举
  @global_msg.msg_info.broadcast({
    type_msg: "change_direction",
    content: ({ "id": id, "direction": direction } : Json).stringify(),
  })
}

///|
/// 自定义测试API：移除指定单位
pub fn remove_unit(id : Int) -> Unit {
  @game.remove_unit(id)
}