export function distributeOrders(team, totalOrders) {
  const activeTeam = team
    .filter((person) => person.status === 'working')
    .sort((a, b) => a.pending - b.pending || a.id - b.id)

  if (activeTeam.length === 0 || totalOrders <= 0) {
    return {}
  }

  const allocations = {}
  const baseShare = Math.floor(totalOrders / activeTeam.length)
  let remainder = totalOrders % activeTeam.length

  for (const person of activeTeam) {
    allocations[person.id] = baseShare

    if (remainder > 0) {
      allocations[person.id] += 1
      remainder -= 1
    }
  }

  return allocations
}
