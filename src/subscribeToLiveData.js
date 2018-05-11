import { PubSub } from 'graphql-subscriptions'

import queryExecutor from './queryExecutor'

const eventName = 'liveData'

const subscribeToLiveData = ({
  fieldName,
  type,
  trackState = true,
  eventEmitter: getEventEmitter,
  initialState: getInitialState,
}) => async (
  source,
  args,
  context,
  resolveInfo,
) => {
  const connectionPubSub = new PubSub()
  const asyncIterator = connectionPubSub.asyncIterator(eventName)

  if(typeof trackState != 'boolean') {
    throw new Error('trackState must be a boolean')
  }

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

  const { initialQuery, createPatch, recordPatch } = queryExecutor({
    context,
    resolveInfo,
    type,
    fieldName,
  })

  const publishInitialQuery = async () => {
    /*
     * initialQuery sets the state of the query executor to diff against
     * in later events
     */
    if (trackState) {
      await initialQuery(initialState)
    }
    /*
     * the source is used to generate the initial state and to publish a `query`
     * result to the client.
     */
    connectionPubSub.publish(eventName, { query: initialState })
  }

  const publishPatch = patch => {
    if (patch != null && patch.length > 0) {
      connectionPubSub.publish(eventName, { patch })
    }
  }

  const onUpdate = async ({ nextState }) => {
    if (trackState === false) {
      asyncIterator.throw(new Error(
        'Cannot update subscription with trackState: false'
      ))
    }
    /* generate and send the patch on state changes */
    const patch = await createPatch(nextState)
    publishPatch(patch)
  }

  const onPatch = async ({ patch }) => {
    /* send the externally generated patch and update the state */
    if (trackState) {
      await recordPatch(patch)
    }
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
