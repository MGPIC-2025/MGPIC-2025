///|
priv enum ItemType {
  Resource(@resource.ResourceType)
  Equipment(@equipment.Equipment)
} derive(Eq, ToJson)

///|
struct Item {
  item_type : ItemType
  mut count : Int
} derive(Eq, ToJson)

///|
priv struct Inventory {
  capacity : Int
  items : Array[Item]
} derive(ToJson)

///|
fn Item::new(item_type : ItemType, count? : Int = 1) -> Item {
  { item_type, count }
}

///|
fn Inventory::new(capacity : Int) -> Inventory {
  { capacity, items: [] }
}

///|
fn Inventory::check_resource_in_inventory(
  inventory : Inventory,
  resource : @resource.ResourceType,
) -> Bool {
  inventory.items
  .iter()
  .any(item => item.item_type is Resource(resource_) && resource_ == resource)
}

///|
fn Inventory::check_can_add_item(
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
fn Inventory::add_item(inventory : Inventory, item : Item) -> Unit {
  match item.item_type {
    Resource(resource) => {
      for i in 0..<inventory.items.length() {
        if inventory.items[i].item_type is Resource(resource_) &&
          resource_ == resource {
          inventory.items[i].count += item.count
          // 如果数量<=0，移除该物品
          if inventory.items[i].count <= 0 {
            inventory.items.remove(i) |> ignore
          }
          return
        }
      }
      // 只有在数量>0时才添加新物品
      if item.count > 0 {
        inventory.items.push({ item_type: Resource(resource), count: item.count })
      }
    }
    Equipment(equipment) =>
      inventory.items.push({ item_type: Equipment(equipment), count: item.count })
  }
}

///|
fn Inventory::remove_item(inventory : Inventory, index : Int) -> Item? {
  if inventory.items.length() <= index {
    return None
  }
  Some(inventory.items.remove(index))
}

///|
fn Inventory::craft(inventory : Inventory) -> Bool {
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

///|
fn find_item_amount(inventory : Inventory, item : ItemType) -> Int {
  for item_ in inventory.items {
    if item_.item_type == item {
      return item_.count
    }
  }
  0
}

///|
fn Inventory::check_resource_cost_in_inventory(
  inventory : Inventory,
  resource_cost : @resource.ResourceCost,
) -> Bool {
  for res in resource_cost.cost {
    let (res_type, amount) = res
    if find_item_amount(inventory, Resource(res_type)) < amount {
      return false
    }
  }
  true
}

///|
fn Inventory::consume_resource_cost(
  inventory : Inventory,
  resource_cost : @resource.ResourceCost,
) -> Unit {
  for res in resource_cost.cost {
    let (res_type, amount) = res
    inventory.add_item(Item::new(Resource(res_type), count=-amount))
  }
}
