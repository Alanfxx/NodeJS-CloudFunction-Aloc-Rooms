// { discID => {"3M12":"500","4M12":"500"} } => { "COMP0250":{"3M12":"500","4M12":"500"} }
const transformarResultadoEmObjeto = (alocacao) => {
  const obj = {}
  alocacao.forEach((value, index) => {
    obj[index] = value
  })
  return obj
}

module.exports = app => {

  const { algoritmoGuloso, calcTaxaDesocupacao } = app.algorithm.algoritmo_guloso
  const {getSalasBD, getTurmasBD} = app.algorithm.algoritmo_guloso_funcoes
  
  const run = async (req, res) => {
    const salas = await getSalasBD(app)
    const turmas = await getTurmasBD(app)
    const {alocacao} = algoritmoGuloso(salas, turmas)
    const alocTransformada = transformarResultadoEmObjeto(alocacao)
    const alocId = await app.config.db.alocacao.add(alocTransformada)
      .then(doc => res.status(200).json(doc.id))
      .catch(err => console.log(err))
  }

  const getAll = async (req, res) => {
    const salas = await getSalasBD(app)
    const turmas = await getTurmasBD(app)
    await app.config.db.alocacao.get()
    .then(docs => {
      let aloc = []
      docs.forEach(doc => {
        const alocMap = new Map(Object.entries(doc.data()))
        const taxa = calcTaxaDesocupacao(salas, turmas, alocMap)
        aloc.push({id: doc.id, taxaDesocupacao: taxa, alocacao: doc.data()})
      })
      res.status(200).json(aloc)
    })
    .catch(err => res.status(500).send(err))
  }

  const get = async (req, res) => {
    const salas = await getSalasBD(app)
    const turmas = await getTurmasBD(app)
    let alocRef = app.config.db.alocacao.doc(req.params.id)
    await alocRef.get()
    .then(doc => {
      const alocMap = new Map(Object.entries(doc.data()))
      const taxa = calcTaxaDesocupacao(salas, turmas, alocMap)
      res.status(200).json({id: doc.id, taxaDesocupacao: taxa, alocacao: doc.data()})
    })
    .catch(err => res.status(500).send(err))
  }

  const calcTaxa = async (req, res) => {
    const salas = await getSalasBD(app)
    const turmas = await getTurmasBD(app)
    const aloc = new Map(Object.entries(req.body))
    if(aloc.size < 5) return res.status(500).send('Submeta uma alocacao valida')

    const taxa = calcTaxaDesocupacao(salas, turmas, aloc)
    if(taxa != null) {
      res.status(200).json({taxaDesocupacao: taxa})
    }else{
      res.status(500).send('Não foi possiveil calcular a taxa')
    }
  }

  const save = async (req, res) => {
    const aloc = new Map(Object.entries(req.body))
    if(aloc.size < 5) return res.status(500).send('Submeta uma alocacao valida')

    let documentRef = app.config.db.alocacao.doc(req.params.id)
    return await documentRef.update(req.body)
        .then(() => res.status(204).send())
        .catch(err => res.status(500).send(err))
  }

  const remove = async (req, res) => {
    let documentRef = app.config.db.alocacao.doc(req.params.id)
    return await documentRef.delete()
        .then(() => res.status(204).send())
        .catch(err => res.status(500).send(err))
  }

  return { getAll, get, run, save, calcTaxa, remove }
}

