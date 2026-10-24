export function distributeOrders(team, totalOrders) {
  const activeTeam = team
    .filter((person) => person.status === 'working')
    .sort((a, b) => a.id - b.id)

  if (activeTeam.length === 0 || totalOrders <= 0) {
    return {}
  }

  const allocations = Object.fromEntries(
    activeTeam.map((person) => [person.id, 0]),
  )
  const pendingPriority = [...activeTeam].sort(
    (a, b) =>
      b.pending - a.pending ||
      a.completed - b.completed ||
      a.id - b.id,
  )
  const totalPending = activeTeam.reduce(
    (sum, person) => sum + BigInt(person.pending ?? 0),
    0n,
  )
  let remaining = BigInt(totalOrders)

  if (totalPending >= remaining) {
    for (const person of pendingPriority) {
      const assigned = BigInt(person.pending ?? 0) < remaining
        ? BigInt(person.pending ?? 0)
        : remaining
      allocations[person.id] = Number(assigned)
      remaining -= assigned

      if (remaining === 0n) {
        break
      }
    }

    return allocations
  }

  for (const person of activeTeam) {
    const pending = BigInt(person.pending ?? 0)
    allocations[person.id] = Number(pending)
    remaining -= pending
  }

  const remainingOrders = Number(remaining)
  const evenShare = Math.floor(remainingOrders / activeTeam.length)
  let remainder = remainingOrders % activeTeam.length

  for (const person of activeTeam) {
    allocations[person.id] += evenShare
  }

  for (const person of pendingPriority) {
    if (remainder === 0) {
      break
    }

    allocations[person.id] += 1
    remainder -= 1
  }

  return allocations
}
