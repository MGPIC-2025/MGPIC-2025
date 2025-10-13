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
pub fn Global::get_resource(global : Global) -> Json {
  let resource = global.resource
  {
    "SpiritalSpark": resource.get_resource(@resource.SpiritalSpark),
    "RecallGear": resource.get_resource(@resource.RecallGear),
    "ResonantCrystal": resource.get_resource(@resource.ResonantCrystal),
    "RefinedCopper": resource.get_resource(@resource.RefinedCopper),
    "HeartCrystalDust": resource.get_resource(@resource.HeartCrystalDust),
  }
}

///|
pub fn Global::get_copper_list(global : Global) -> Json {
  let warehouse = global.warehouse
  { "coppers": warehouse.get_copper_list().to_json() }
}

///|
pub fn Global::gacha(global : Global) -> Json {
  let copper = @warehouse.gacha(global.resource)
  if copper is Some(copper) {
    global.warehouse = global.warehouse.add_copper(copper)
    { "type": "success", "copper": copper }
  } else {
    { "type": "error", "content": "资源不足" }
  }
}

///|
pub let global : Global = Global::new()
