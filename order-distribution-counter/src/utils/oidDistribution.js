import { distributeOrders } from './distribution'

export function parseOids(value) {
  return value.split(/\r?\n/).map((oid) => oid.trim()).filter(Boolean)
}

export function createOidAssignments(team, oidInput) {
  const oids = Array.isArray(oidInput) ? oidInput : parseOids(oidInput)
  const allocations = distributeOrders(team, oids.length)
  let oidIndex = 0
  return team.filter((person) => person.status === 'working').map((person) => {
    const count = allocations[person.id] ?? 0
    const assignedOids = oids.slice(oidIndex, oidIndex + count)
    oidIndex += count
    return { ...person, oids: assignedOids }
  })
}
