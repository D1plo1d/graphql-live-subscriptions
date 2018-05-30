import { PubSub } from 'graphql-subscriptions'

// import queryExecutor from './queryExecutors/FullQueryExecutor'
import queryExecutor from './queryExecutors/ReactiveQueryExecutor'

const eventName = 'liveData'

const subscribeToLiveData = ({
  fieldName = 'live',
  type,
  eventEmitter: getEventEmitter,
  initialState: getInitialState,
  sourceRoots = {},
}) => async (
  source,
  args,
  context,
  resolveInfo,
) => {
  const onError = (e) => {
    console.error(e)
  }

  const connectionPubSub = new PubSub()
  const asyncIterator = connectionPubSub.asyncIterator(eventName)

  // if (type == null) {
  //   throw new Error('subscribeToLiveData \'type\' argument is required')
  // }

  let eventEmitter = getEventEmitter(
    source,
    args,
    context,
    resolveInfo,
  )
  if (eventEmitter.then != null) {
    /* resolve promises */
    eventEmitter = await eventEmitter
  }
  if (eventEmitter == null || eventEmitter.on == null) {
    const msg = (
      'eventEmitter must either return a Promise or an instance of EventEmitter'
    )
    throw new Error(msg)
  }

  let initialState = getInitialState(
    source,
    args,
    context,
    resolveInfo,
  )
  if (initialState.then != null) {
    /* resolve promises */
    initialState = await initialState
  }
  if (initialState == null) {
    throw new Error(
      'initialState cannot return null'
    )
  }

  const { initialQuery, createPatch, recordPatch } = (() => {
    try {
      return queryExecutor({
        context,
        resolveInfo,
        type,
        fieldName,
        sourceRoots,
      })
    } catch (e) {
      onError(e)
      throw e
    }
  })()

  const publishPatch = (patch) => {
    console.log('publish PATCH', patch)
    if (patch != null && patch.length > 0) {
      connectionPubSub.publish(eventName, { patch })
    }
  }

  const publishInitialQuery = async () => {
    /*
     * initialQuery sets the state of the query executor to diff against
     * in later events
     */
    try {
      await initialQuery(initialState)
    } catch (e) {
      onError(e)
      throw e
    }
    /*
     * the source is used to generate the initial state and to publish a `query`
     * result to the client.
     */
    console.log('INITIAL', resolveInfo.fieldNodes[0].name.value, resolveInfo.fieldNodes[0].selectionSet.selections.map(f => f.name.value))
    connectionPubSub.publish(eventName, { query: initialState })
    // connectionPubSub.publish(eventName, { patch: [ { op: 'replace', value: 'test' } ], query: { houses: ['test'] } })
    // publishPatch([{
    //   op: 'replace',
    //   value: '123 real st apt. 1',
    //   path: '/houses/0/address',
    // }])
  }

  const onUpdate = async ({ nextState }) => {
    /* generate and send the patch on state changes */
    try {
      const patch = await createPatch(nextState)
      publishPatch(patch)
    } catch (e) {
      onError(e)
      throw e
    }
  }

  const onPatch = async ({ patch }) => {
    /* send the externally generated patch and update the state */
    await recordPatch(patch)
    publishPatch(patch)
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
    eventEmitter.on('update', onUpdate)
    eventEmitter.on('patch', onPatch)
  })

  return asyncIterator
}

export default subscribeToLiveData
