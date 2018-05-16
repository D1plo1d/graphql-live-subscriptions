const executionContextFromInfo = (resolveInfo, contextValue) => ({
  schema: resolveInfo.schema,
  fragments: resolveInfo.fragments,
  rootValue: resolveInfo.rootValue,
  contextValue,
  operation: resolveInfo.operation,
  variableValues: resolveInfo.variableValues,
  fieldResolver: source => source,
  errors: [],
})

export default executionContextFromInfo
