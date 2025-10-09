pub struct Warehouse {
  coppers : @moonbitlang/core/immut/hashmap.HashMap[Int, @coppers.Copper]
}


pub fn Warehouse::new() -> Warehouse {
  { coppers: @moonbitlang/core/immut/hashmap.HashMap::new() }
}

pub fn Warehouse::add_copper(warehouse : Warehouse, copper : @coppers.Copper) -> Warehouse {
  { ..warehouse, coppers: warehouse.coppers.add(copper.id, copper) }
}
