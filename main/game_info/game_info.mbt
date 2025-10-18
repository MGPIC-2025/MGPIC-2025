///|
struct GameInfo(Unit)

///|
pub fn GameInfo::new() -> GameInfo {
  GameInfo(())
}

///|
pub fn move_to(from_x : Int, from_y : Int, to_x : Int, to_y : Int) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "move",
    content: (
      { "from_x": from_x, "from_y": from_y, "to_x": to_x, "to_y": to_y } : Json).stringify(),
  })
}
