///|
pub struct Global {
  resource : Map[@resource.ResourceType, Int]
}

///|
pub fn Global::new() -> Global {
  let resource = Map::from_array([
    (@resource.SpiritalSpark, 0),
    (@resource.RecallGear, 0),
    (@resource.ResonantCrystal, 0),
    (@resource.RefinedCopper, 0),
    (@resource.HeartCrystalDust, 0),
  ])
  { resource, }
}

///|
pub fn Global::get_resource(
  global : Global,
  resource : @resource.ResourceType,
) -> Int {
  global.resource.get(resource).unwrap()
}

///|
pub fn Global::consume_resource(
  global : Global,
  resource : @resource.ResourceType,
  amount : Int,
) -> Unit {
  let resource_amount = global.resource.get(resource).unwrap()
  if resource_amount < amount {
    @global_msg.msg_info.broadcast({
      type_msg: "resource_not_enough",
      content: "资源不足",
    })
  } else {
    global.resource.set(resource, resource_amount - amount)
  }
}

///|
pub let global : Global = Global::new()
