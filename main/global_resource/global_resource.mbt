///|
struct GlobalResource(Map[@resource.ResourceType, Int])

///|
pub fn GlobalResource::new() -> GlobalResource {
  GlobalResource(
    Map::from_array([
      (@resource.SpiritalSpark, 0),
      (@resource.RecallGear, 0),
      (@resource.ResonantCrystal, 0),
      (@resource.RefinedCopper, 0),
      (@resource.HeartCrystalDust, 0),
    ]),
  )
}

///|
pub fn GlobalResource::get_resource(
  global : GlobalResource,
  resource : @resource.ResourceType,
) -> Int {
  global.0.get(resource).unwrap()
}

///|
pub fn GlobalResource::consume_resource(
  global : GlobalResource,
  resource : @resource.ResourceType,
  amount : Int,
) -> Unit {
  let resource_amount = global.0.get(resource).unwrap()
  if resource_amount < amount {
    @global_msg.msg_info.broadcast({
      type_msg: "resource_not_enough",
      content: "资源不足",
    })
  } else {
    global.0.set(resource, resource_amount - amount)
  }
}
