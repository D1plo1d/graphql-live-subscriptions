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

  if (type == null) {
    throw new Error('subscribeToLiveData \'type\' argument is required')
  }

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
    throw new Error(
      'eventEmitter must either return a Promise or an instance of EventEmitter'
    )
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
    connectionPubSub.publish(eventName, { query: initialState })
  }

  const publishPatch = (patch) => {
    if (patch != null && patch.length > 0) {
      connectionPubSub.publish(eventName, { patch })
    }
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
