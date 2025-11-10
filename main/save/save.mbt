///|
pub fn warehouse_to_json(warehouse : @warehouse.Warehouse) -> Json {
  let coppers = warehouse.get_copper_list()
  coppers.map(copper => copper.to_json()).to_json()
}

///|
pub fn export_save() -> String {
  let global = @global.global
  (
    {
      "warehouse": warehouse_to_json(global.val.warehouse),
      "bag": {
        "resources": {
          "SpiritalSpark": global.val.bag.resources.get_resource(
            @resource.SpiritalSpark,
          ),
          "RecallGear": global.val.bag.resources.get_resource(
            @resource.RecallGear,
          ),
          "ResonantCrystal": global.val.bag.resources.get_resource(
            @resource.ResonantCrystal,
          ),
          "RefinedCopper": global.val.bag.resources.get_resource(
            @resource.RefinedCopper,
          ),
          "HeartCrystalDust": global.val.bag.resources.get_resource(
            @resource.HeartCrystalDust,
          ),
        },
        "equipments": global.val.bag.equipments.to_json(),
      },
    } : Json).stringify()
}

///|
pub fn warehouse_from_json(json : Json) -> @warehouse.Warehouse {
  let mut warehouse = @warehouse.Warehouse::empty()
  guard json is Array(array)
  for copper in array {
    let copper = try! @json.from_json(copper)
    warehouse = warehouse.add_copper(copper)
  }
  warehouse
}

///|
pub fn global_resource_from_json(
  json : Json,
) -> @global_resource.GlobalResource {
  let resources = json.as_object().unwrap()
  let global_resource = @global_resource.GlobalResource::empty()
  for x in resources {
    let (key, value) = x
    match key {
      "SpiritalSpark" =>
        global_resource.add_resource(
          @resource.SpiritalSpark,
          value.as_number().unwrap().to_int(),
        )
      "RecallGear" =>
        global_resource.add_resource(
          @resource.RecallGear,
          value.as_number().unwrap().to_int(),
        )
      "ResonantCrystal" =>
        global_resource.add_resource(
          @resource.ResonantCrystal,
          value.as_number().unwrap().to_int(),
        )
      "RefinedCopper" =>
        global_resource.add_resource(
          @resource.RefinedCopper,
          value.as_number().unwrap().to_int(),
        )
      "HeartCrystalDust" =>
        global_resource.add_resource(
          @resource.HeartCrystalDust,
          value.as_number().unwrap().to_int(),
        )
      _ => ()
    }
  }
  global_resource
}

///|
pub fn bag_from_json(json : Json) -> @global_resource.Bag {
  guard json is Object(obj)
  let resources = global_resource_from_json(obj["resources"])
  let equipments = obj["equipments"]
    .as_array()
    .unwrap()
    .map(equipment => (try! @json.from_json(equipment) : @equipment.Equipment))
  @global_resource.Bag::from_existing(resources, equipments)
}

///|
pub fn import_save(save : String) -> Unit {
  let save = try! @json.parse(save).as_object().unwrap()
  let warehouse = warehouse_from_json(save["warehouse"])
  let bag = bag_from_json(save["bag"])
  let global = @global.Global::from_existing(warehouse, bag)
  @global.global.val = global
}
