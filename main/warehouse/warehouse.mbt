///|
pub struct Warehouse {
  coppers : @moonbitlang/core/immut/hashmap.HashMap[Int, @coppers.Copper]
}

///|
pub fn Warehouse::new() -> Warehouse {
  let copper_1 = @coppers.summon_copper_from_info("阿磐")
  let copper_2 = @coppers.summon_copper_from_info("咝咝")
  let copper_3 = @coppers.summon_copper_from_info("波波")
  let default = @moonbitlang/core/immut/hashmap.HashMap::new()
    .add(copper_1.id, copper_1)
    .add(copper_2.id, copper_2)
    .add(copper_3.id, copper_3)
  { coppers: default }
}

///|
pub fn Warehouse::empty() -> Warehouse {
  { coppers: @moonbitlang/core/immut/hashmap.HashMap::new() }
}

///|
pub fn Warehouse::add_copper(
  warehouse : Warehouse,
  copper : @coppers.Copper,
) -> Warehouse {
  { coppers: warehouse.coppers.add(copper.id, copper) }
}

///|
pub fn Warehouse::get_copper(
  warehouse : Warehouse,
  id : Int,
) -> @coppers.Copper {
  warehouse.coppers.get(id).unwrap()
}

///|
pub fn Warehouse::get_copper_list(
  warehouse : Warehouse,
) -> Array[@coppers.Copper] {
  warehouse.coppers.values().to_array()
}

///|
pub fn Warehouse::remove_copper(warehouse : Warehouse, id : Int) -> Warehouse {
  { coppers: warehouse.coppers.remove(id) }
}
