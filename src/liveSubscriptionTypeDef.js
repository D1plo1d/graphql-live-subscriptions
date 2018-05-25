const liveSubscriptionTypeDef = ({
  type = 'LiveSubscription',
  queryType = 'Query',
  subscriptionName = 'live',
}) => `
  scalar JSON

  extend Subscription {
    ${subscriptionName}: ${type}
  }

  type ${type} {
    query: ${queryType}
    patch: [RFC6902Operation]
  }

  type RFC6902Operation {
    op: String!
    path: String!
    from: String
    value: JSON
  }
`

export default liveSubscriptionTypeDef
