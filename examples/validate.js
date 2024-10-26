const { parserEnvironment } = require('../index')

for(const envFile of ['1.d.ts', '2.d.ts']) {
  parserEnvironment(envFile)
}