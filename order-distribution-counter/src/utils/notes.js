export const errorTypes = [
  'Others',
  'Order not placed',
  'Duplicated order',
  'FTD error',
  'Wrong recipient information',
  'Wrong delivery date',
  'Wrong delivery address',
  'Wrong flower description',
  'Missing institution name',
  'Missing add on',
  'Missing special instruction',
  'Wrong occasion',
]

export const actions = ['Include', 'Send', 'Add', 'Verify']

export const quickCopyNotes = [
  'PJ KIM T. GARCIA',
  '135432',
  'AUDITED || FTD || COMPLETED BY',
  'AUDITED || BLM|| COMPLETED BY',
  'AUDITED || DOVEPLUS || COMPLETED BY',
  'COMPLETED VIA GOOGLE SHEET',
  'ORDER PREVIEW MODE',
]

const concernErrorTypes = new Set([
  'Order not placed',
  'Duplicated order',
  'FTD error',
  'Wrong occasion',
])

const suggestedFormatTypes = new Set([
  'Missing institution name',
  'Missing special instruction',
  'Wrong recipient information',
  'Wrong delivery date',
])

export function getMessageVersion(errorType) {
  return concernErrorTypes.has(errorType) ? 2 : 1
}

export function supportsSuggestedFormat(errorType) {
  return suggestedFormatTypes.has(errorType)
}

export function normalizeOid(value) {
  let oid = value.trim()
  while (/^OID\s*:/i.test(oid)) {
    oid = oid.replace(/^OID\s*:\s*/i, '').trim()
  }
  return oid ? `OID: ${oid}` : ''
}

function punctuateMessage(value) {
  const message = value.trim().replace(/([.!?])\1+$/u, '$1')
  if (!message) return ''
  return /[.!?]$/u.test(message) ? message : `${message}.`
}

export function generateRequestSentence(action, message) {
  const request = message.trim()
  if (!action || !request) return ''
  return `Kindly ${action.toLowerCase()} ${punctuateMessage(request)}`
}

export function generateMissingCardMessage(message) {
  const cardMessage = punctuateMessage(message)
  return cardMessage ? `Kindly include the missing card message: ${cardMessage}` : ''
}

export function generateSuggestedRequest(errorType, value) {
  if (errorType === 'Missing institution name') {
    const institution = punctuateMessage(value)
    return institution ? `Kindly include Institution Name: ${institution}` : ''
  }
  if (errorType === 'Missing special instruction') {
    const instruction = punctuateMessage(value)
    return instruction ? `Kindly include the missing SI: ${instruction}` : ''
  }
  if (errorType === 'Wrong recipient information') {
    return 'Kindly send the florist the right recipient name.'
  }
  if (errorType === 'Wrong delivery date') {
    return 'Kindly verify the right delivery date.'
  }
  return ''
}

export function generateSalesMessage({
  oid,
  errorType,
  action,
  message,
  isWrongPunctuation,
  isMissingCardMessage,
  useStandardRequest,
  templateValue,
  timeWindow,
}) {
  const formattedOid = normalizeOid(oid)
  if (!formattedOid) return ''

  if (isWrongPunctuation && timeWindow === 'moreThan30') return ''
  if (isWrongPunctuation) {
    if (timeWindow !== '30OrLess') return ''
    return `${formattedOid}\nKindly send the florist the card message with proper punctuation.\nThank you!\n@Placement`
  }

  if (isMissingCardMessage) {
    const request = generateMissingCardMessage(message)
    return request ? `${formattedOid}\n${request} Thank you.\n@Placement` : ''
  }

  if (supportsSuggestedFormat(errorType) && !useStandardRequest) {
    const request = generateSuggestedRequest(errorType, templateValue)
    if (!request) return ''
    const thankYou = errorType === 'Wrong recipient information'
      ? 'Thank you!'
      : 'Thank you.'
    return `${formattedOid}\n${request}\n${thankYou}\n@Placement`
  }

  if (getMessageVersion(errorType) === 2) {
    return `${formattedOid}\nConcern: ${errorType}. Thank you.\n@Placement`
  }

  const request = generateRequestSentence(action, message)
  if (!request) return ''
  return `${formattedOid}\n${request} Thank you.\n@Placement`
}

export function generateCRMLog({
  oid,
  errorType,
  action,
  message,
  isWrongPunctuation,
  isMissingCardMessage,
  useStandardRequest,
  templateValue,
  timeWindow,
}) {
  if (isWrongPunctuation && timeWindow === 'moreThan30') {
    return 'Wrong Punctuation | More than 30 minutes'
  }

  if (!normalizeOid(oid)) return ''

  if (isWrongPunctuation) {
    if (timeWindow !== '30OrLess') return ''
    return 'Wrong Punctuation | Endorsed to Placement'
  }

  if (isMissingCardMessage) {
    const request = generateMissingCardMessage(message)
    return request ? `${request} || Endorsed to Placement` : ''
  }

  if (supportsSuggestedFormat(errorType) && !useStandardRequest) {
    const request = generateSuggestedRequest(errorType, templateValue)
    return request ? `${request} || Endorsed to Placement` : ''
  }

  if (getMessageVersion(errorType) === 2) {
    return `${errorType} || Endorsed to Placement`
  }

  const request = generateRequestSentence(action, message)
  return request ? `${request} || Endorsed to Placement` : ''
}
