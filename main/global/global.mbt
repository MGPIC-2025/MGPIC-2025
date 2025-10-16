///|
pub struct Global {
  resource : @global_resource.GlobalResource
  mut warehouse : @warehouse.Warehouse
}

///|
pub fn Global::new() -> Global {
  {
    resource: @global_resource.GlobalResource::new(),
    warehouse: @warehouse.Warehouse::new(),
  }
}

///|
pub fn Global::get_resource(global : Global) -> String {
  let resource = global.resource
  {
    "SpiritalSpark": resource.get_resource(@resource.SpiritalSpark),
    "RecallGear": resource.get_resource(@resource.RecallGear),
    "ResonantCrystal": resource.get_resource(@resource.ResonantCrystal),
    "RefinedCopper": resource.get_resource(@resource.RefinedCopper),
    "HeartCrystalDust": resource.get_resource(@resource.HeartCrystalDust),
  }.to_string()
}

///|
pub fn Global::get_copper_list(global : Global) -> String {
  let warehouse = global.warehouse
  { "coppers": warehouse.get_copper_list().to_json() }.to_string()
}

///|
pub fn Global::gacha(global : Global) -> String {
  let copper = @warehouse.gacha(global.resource)
  (
    if copper is Some(copper) {
      global.warehouse = global.warehouse.add_copper(copper)
      { "type": "success", "copper": copper }
    } else {
      { "type": "error", "content": "资源不足" }
    } : Json).to_string()
}

///|
pub fn Global::upgrade_copper(global : Global, id : Int) -> String {
  let warehouse = global.warehouse
  let copper = warehouse.get_copper(id)
  let upgrade_cost = @coppers.get_upgrade_cost(copper.level)
  (
    if @global_resource.GlobalResource::check_resource_cost(
        global.resource,
        upgrade_cost,
      ) {
      let upgraded_copper = copper.apply_upgrade()
      @global_resource.GlobalResource::consume_resource_cost(
        global.resource,
        upgrade_cost,
      )
      global.warehouse = global.warehouse.remove_copper(id)
      global.warehouse = global.warehouse.add_copper(upgraded_copper)
      { "type": "success" }
    } else {
      { "type": "error", "content": "资源不足" }
    } : Json).to_string()
}

///|
pub let global : Global = Global::new()
