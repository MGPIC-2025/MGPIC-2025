///|
pub(all) struct InformationBase {
  type_msg : String
  content : String
} derive(ToJson)

///|
struct Information {
  id : Int
  type_msg : String
  content : String
} derive(ToJson)

///|
struct GlobalInfo {
  history : Array[Information]
  mut callback : (Information) -> Unit
}

///|
pub fn GlobalInfo::new() -> GlobalInfo {
  { history: [], callback: fn(_) -> Unit {  } }
}

///|
pub fn GlobalInfo::subscribe(
  global_info : GlobalInfo,
  callback : (Information) -> Unit,
) -> Unit {
  global_info.callback = callback
}

///|
///
pub fn GlobalInfo::broadcast(
  global_info : GlobalInfo,
  information : InformationBase,
) -> Unit {
  let information = {
    id: @id.msg_pool.get_id(),
    type_msg: information.type_msg,
    content: information.content,
  }
  global_info.history.push(information)
  (global_info.callback)(information)
}

///|
pub let msg_info : GlobalInfo = GlobalInfo::new()
