///|
using @resource {type ResourceType}

///|
using @equipment {type Equipment}

///|
enum ItemType {
  Resource(ResourceType)
  Equipment(Equipment)
} derive(Eq)

///|
struct Item {
  item_type : ItemType
  mut count : Int
} derive(Eq)

///|
struct Inventory {
  capacity : Int
  items : Array[Item]
}

///|
pub fn Item::new(item_type : ItemType, count? : Int = 1) -> Item {
  { item_type, count }
}

///|
pub fn Inventory::new(capacity : Int) -> Inventory {
  { capacity, items: [] }
}

///|
pub fn Inventory::check_resource_in_inventory(
  inventory : Inventory,
  resource : @resource.ResourceType,
) -> Bool {
  inventory.items
  .iter()
  .any(item => item.item_type is Resource(resource_) && resource_ == resource)
}

///|
pub fn Inventory::check_can_add_item(
  inventory : Inventory,
  item : ItemType,
) -> Bool {
  if inventory.items.length() < inventory.capacity {
    return true
  }
  for item_ in inventory.items {
    if item_.item_type is Resource(_) && item_.item_type == item {
      return true
    }
  }
  false
}

///|
pub fn Inventory::add_item(inventory : Inventory, item : Item) -> Unit {
  match item.item_type {
    Resource(resource) => {
      for i in 0..<inventory.items.length() {
        if inventory.items[i].item_type is Resource(resource_) &&
          resource_ == resource {
          inventory.items[i].count += item.count
          return
        }
      }
      inventory.items.push({ item_type: Resource(resource), count: 1 })
    }
    Equipment(equipment) =>
      inventory.items.push({ item_type: Equipment(equipment), count: 1 })
  }
}

///|
pub fn Inventory::remove_item(inventory : Inventory, index : Int) -> Item? {
  if inventory.items.length() <= index {
    return None
  }
  Some(inventory.items.remove(index))
}

///|
pub fn Inventory::craft(inventory : Inventory) -> Bool {
  let heart_crystal_dust = inventory.check_resource_in_inventory(
    @resource.HeartCrystalDust,
  )
  let recall_gear = inventory.check_resource_in_inventory(@resource.RecallGear)
  let resonant_crystal = inventory.check_resource_in_inventory(
    @resource.ResonantCrystal,
  )
  let refined_copper = inventory.check_resource_in_inventory(
    @resource.RefinedCopper,
  )
  let spirital_spark = inventory.check_resource_in_inventory(
    @resource.SpiritalSpark,
  )
  if (heart_crystal_dust && recall_gear && resonant_crystal && refined_copper) &&
    (spirital_spark || inventory.capacity < inventory.items.length()) {
    inventory.add_item(Item::new(Resource(@resource.SpiritalSpark), count=1))
    inventory.add_item(Item::new(Resource(@resource.RecallGear), count=-1))
    inventory.add_item(Item::new(Resource(@resource.ResonantCrystal), count=-1))
    inventory.add_item(Item::new(Resource(@resource.RefinedCopper), count=-1))
    inventory.add_item(
      Item::new(Resource(@resource.HeartCrystalDust), count=-1),
    )
    true
  } else {
    false
  }
}
