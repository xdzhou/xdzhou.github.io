/*NEURON**********************************************************************/
class Neuro {
  constructor(weights) {
    this.value = 0;
    this.weights = weights;
  }

  compute(preLayer, activationFun) {
    var sum = 0;
    for (var i = 0; i < preLayer.neuros.length; i++) {
      sum += preLayer.neuros[i].value * this.weights[i];
    }
    this.value = activationFun(sum);
  }

  collectWeights(weightConsumer) {
    if (this.weights != undefined) {
      for (var w of this.weights) {
        weightConsumer(w);
      }
    }
  }
}

/*LAYER**********************************************************************/
class Layer {
  constructor(neuros) {
    this.neuros = neuros;
  }

  compute(preLayer, activationFun) {
    for (var neuro of this.neuros) {
      neuro.compute(preLayer, activationFun);
    }
  }

  collectWeights(weightConsumer) {
    for (var neuro of this.neuros) {
      neuro.collectWeights(weightConsumer);
    }
  }
}

/*NETWORK DATA**********************************************************************/
class NetworkData {
  constructor(layerCounts, weights) {
    this.layerCounts = layerCounts;
    this.weights = weights;
  }

  static withLayerCounts(layerCounts) {
    var weightSize = 0;
    for (var i = 1; i < layerCounts.length; i++) {
      weightSize += layerCounts[i - 1] * layerCounts[i];
    }
    var weights = [];
    for (var i = 0; i < weightSize; i++) {
      weights.push(Math.random() * 2 - 1);
    }
    return new NetworkData(layerCounts, weights);
  }
}

/*ANN UTILS**********************************************************************/
class AnnUtils {
  static logistic(value) {
    return 1 / (1 + Math.exp(-value));
  }
}

/*NETWORK**********************************************************************/
class Network {
  constructor(networkData) {
    this.layers = [];
    this.layers.push(this.inputLayer(networkData.layerCounts[0]));
    var start = 0;
    for (var i = 1; i < networkData.layerCounts.length; i++) {
      var preSize = networkData.layerCounts[i - 1];
      var thisSize = networkData.layerCounts[i];
      this.layers.push(this.otherLayer(preSize, thisSize, networkData.weights, start));
      start += preSize * thisSize;
    }
  }

  inputLayer(inputSize) {
    var neuros = [];
    for (var i = 0; i < inputSize; i++) {
      // input neuro has no weights
      neuros.push(new Neuro(undefined));
    }
    return new Layer(neuros);
  }

  otherLayer(preLayerSize, thisLayerSize, allWeights, start) {
    var neuros = [];
    var index = start;
    for (var i = 0; i < thisLayerSize; i++) {
      var weights = [];
      for (var j = 0; j < preLayerSize; j++) {
        weights.push(allWeights[index]);
        index++;
      }
      neuros.push(new Neuro(weights));
    }
    return new Layer(neuros);
  }

  toData() {
    var layerCounts = [];
    var weights = [];
    for (var layer of this.layers) {
      layerCounts.push(layer.neuros.length);
    }
    for (var i = 1; i < this.layers.length; i++) {
      this.layers[i].collectWeights(w => weights.push(w));
    }
    return new NetworkData(layerCounts, weights);
  }

  compute(inputs) {
    var inputLayer = this.layers[0];
    for (var i = 0; i < inputs.length; i++) {
      inputLayer.neuros[i].value = inputs[i];
    }
    for (var i = 1; i < this.layers.length; i++) {
      this.layers[i].compute(this.layers[i - 1], value => AnnUtils.logistic(value));
    }
    var outputLayer = this.layers[this.layers.length - 1];
    var outputs = [];
    for (var n of outputLayer.neuros) {
      outputs.push(n.value);
    }
    return outputs;
  }
}

/*GENETIC CONF**********************************************************************/
class GeneticConf {
  constructor(options) {
    this.mergeRate = 0.5;
    this.mutationRate = 0.05;
    this.population = 20;
    this.generateChildCount = 2;

    for (var key in options) {
      this[key] = options[key];
    }
  }
}

/*GENOME**********************************************************************/
class Genome {
  constructor(score, data) {
    this.score = score;
    this.data = data;
  }

  clone() {
    var newScore = JSON.parse(JSON.stringify(this.score));
    var newData = JSON.parse(JSON.stringify(this.data));
    return new Genome(newScore, newData);
  }
}

/*GENERATION**********************************************************************/
class Generation {
  constructor(genomes) {
    this.genomes = genomes;
  }

  nextGeneration(conf) {
    this.genomes.sort((a, b) => b.score - a.score);
    var newGenomes = [];
    //TODO conf
    newGenomes.push(this.genomes[0].clone());
    newGenomes.push(this.genomes[1].clone());
    newGenomes.push(this.genomes[2].clone());
    var maxSum = this.genomes.length * 2 - 3;
    for (var sum = 1; sum <= maxSum; sum++) {
      var first = 0;
      var last = sum - first;
      while (first < last) {
        for (var i = 0; i < conf.generateChildCount; i++) {
          newGenomes.push(this.merge(this.genomes[first], this.genomes[last], conf));
          if (newGenomes.length == conf.population) {
            return new Generation(newGenomes);
          }
        }
        first++;
        last--;
      }
    }
  }

  merge(g1, g2, conf) {
    var child = g1.clone();
    for (var i = 0; i < child.data.weights.length; i++) {
      if (Math.random() < conf.mergeRate) {
        child.data.weights.splice(i, 1, g2.data.weights[i]);
      }
      if (Math.random() < conf.mutationRate) {
        child.data.weights.splice(i, 1, Math.random() * 2 - 1);
      }
    }
    //console.log("return child : " + JSON.stringify(child));
    return child;
  }
}

//NetworkData
/*
var data = NetworkData.withLayerCounts([2,2,1]);
var nw = new Network(data);
var genome1 = new Genome(1, nw.toData());
var genome2 = new Genome(2, NetworkData.withLayerCounts([2,2,1]));
var gen = new Generation([genome1, genome2]);
var conf = new GeneticConf({population:2, generateChildCount:2});


console.log(JSON.stringify(nw.compute([10,-9])));
console.log("generation: " +JSON.stringify(gen));
console.log("conf: "+JSON.stringify(conf));
console.log("next generation: " +JSON.stringify(gen.nextGeneration(conf)));
*/