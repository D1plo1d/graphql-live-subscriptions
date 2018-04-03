import { PubSub } from 'graphql-subscriptions'

import queryExecutor from './queryExecutor'

const eventName = 'liveData'

const subscribeToLiveData = ({
  getSubscriptionProvider,
  getSource,
  type,
}) => async (source, args, context, resolveInfo) => {
  const connectionPubSub = new PubSub()
  const nestedFnArgs = [source, args, context, resolveInfo]

  if (type == null) {
    throw new Error('subscribeToLiveData \'type\' argument is required')
  }

  const { initialQuery, diff } = queryExecutor({
    context,
    resolveInfo,
    type,
  })

  const subscriptionProvider = await getSubscriptionProvider(...nestedFnArgs)

  const publishInitialQuery = async () => {
    const data = await getSource(...nestedFnArgs)
    /*
     * initialQuery sets the state of the query executor to diff against
     * in later events
     */
    await initialQuery(data)
    /*
     * the same data is used in the initialQuery is used to publish a `query`
     * result to the client.
     */
    connectionPubSub.publish(eventName, { query: data })
  }

  const onChange = async () => {
    /* send query diffs on state changes */
    const data = await getSource(...nestedFnArgs)
    const patches = await diff(data)
    if (patches != null && patches.length > 0) {
      connectionPubSub.publish(eventName, { patches })
    }
  }

  setImmediate(async () => {
    /*
     * immediately set the initialQuery and send the query results upon
     * connection
     */
    await publishInitialQuery()
    /*
     * subscribe to changes once the initial query has been sent
     */
    subscriptionProvider.subscribe(onChange)
  })

  return connectionPubSub.asyncIterator(eventName)
}

export default subscribeToLiveData
