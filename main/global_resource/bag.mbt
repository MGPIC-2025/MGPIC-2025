///|
pub struct Bag {
  resources : GlobalResource
  equipments : Array[@equipment.Equipment]
} derive(ToJson)

///|
pub fn Bag::new() -> Bag {
  { resources: GlobalResource::new(), equipments: [] }
}

///|
pub fn Bag::from_existing(
  resources : GlobalResource,
  equipments : Array[@equipment.Equipment],
) -> Bag {
  { resources, equipments }
}

///|
pub fn Bag::add_resource(bag : Bag, resource : Array[Item]) -> Unit {
  for item in resource {
    match item.item_type {
      Resource(resource) => bag.resources.add_resource(resource, item.count)
      Equipment(equipment) => bag.equipments.push(equipment)
    }
  }
}

///|
pub(all) enum ItemType {
  Resource(@resource.ResourceType)
  Equipment(@equipment.Equipment)
} derive(Eq, ToJson)

///|
struct Item {
  item_type : ItemType
  count : Int
} derive(Eq, ToJson)

///|
pub fn Item::new(item_type : ItemType, count? : Int = 1) -> Item {
  { item_type, count }
}
