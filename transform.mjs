const transformer = new BookTransformer({
    maxFibLevel: 5, // Stop at 21-sentence groups
    coherenceModel: 'gemma3:1b',
    fixModel: 'gemma3:12b'
});

await transformer.transformBook('input.txt', 'output.txt', [
    ['Harry', 'Alex'],
    ['wizard', 'engineer'],
    ['magic', 'technology']
]);