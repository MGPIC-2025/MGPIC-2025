///|
pub struct Global {
  mut warehouse : @warehouse.Warehouse
  bag : @global_resource.Bag
}

///|
pub fn Global::new() -> Global {
  { bag: @global_resource.Bag::new(), warehouse: @warehouse.Warehouse::new() }
}

///|
pub fn Global::get_resource(global : Global) -> String {
  let resource = global.bag.resources
  (
    {
      "SpiritalSpark": resource.get_resource(@resource.SpiritalSpark),
      "RecallGear": resource.get_resource(@resource.RecallGear),
      "ResonantCrystal": resource.get_resource(@resource.ResonantCrystal),
      "RefinedCopper": resource.get_resource(@resource.RefinedCopper),
      "HeartCrystalDust": resource.get_resource(@resource.HeartCrystalDust),
    } : Json).stringify()
}

///|
pub fn Global::get_bag(global : Global) -> String {
  global.bag.to_json().stringify()
}

///|
pub fn Global::get_copper_list(global : Global) -> String {
  let warehouse = global.warehouse
  ({ "coppers": warehouse.get_copper_list().to_json() } : Json).stringify()
}

///|
pub fn Global::gacha(global : Global) -> String {
  let copper = @warehouse.gacha(global.bag.resources)
  (
    if copper is Some(copper) {
      global.warehouse = global.warehouse.add_copper(copper)
      { "type": "success", "copper": copper }
    } else {
      { "type": "error", "content": "资源不足" }
    } : Json).stringify()
}

///|
pub fn Global::upgrade_copper(global : Global, id : Int) -> String {
  let warehouse = global.warehouse
  let copper = warehouse.get_copper(id)
  let upgrade_cost = @coppers.get_upgrade_cost(copper.level)
  (
    if @global_resource.GlobalResource::check_resource_cost(
        global.bag.resources,
        upgrade_cost,
      ) {
      let upgraded_copper = copper.apply_upgrade()
      @global_resource.GlobalResource::consume_resource_cost(
        global.bag.resources,
        upgrade_cost,
      )
      global.warehouse = global.warehouse.remove_copper(id)
      global.warehouse = global.warehouse.add_copper(upgraded_copper)
      { "type": "success" }
    } else {
      { "type": "error", "content": "资源不足" }
    } : Json).stringify()
}

///|
pub fn Global::craft(global : Global) -> String {
  let cost = @resource.ResourceCost::new([
    (@resource.RefinedCopper, 1),
    (@resource.ResonantCrystal, 1),
    (@resource.HeartCrystalDust, 1),
    (@resource.RecallGear, 1),
  ])
  (
    if global.bag.resources.check_resource_cost(cost) {
      global.bag.resources.consume_resource_cost(cost)
      global.bag.resources.add_resource(@resource.SpiritalSpark, 1)
      { "type": "success" }
    } else {
      { "type": "error", "content": "资源不足" }
    } : Json).stringify()
}

///|
pub let global : Global = Global::new()
