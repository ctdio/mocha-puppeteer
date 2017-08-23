// TODO: Make these options configurable

const { mocha } = window

mocha.setup('bdd')
mocha.reporter('spec')
mocha.useColors(true)
