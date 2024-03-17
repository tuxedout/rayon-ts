<script setup lang="ts">

  import {ref, onMounted, onUnmounted} from "vue";

  const canvas = ref<HTMLCanvasElement>();

  import {RNSDFBox, RNSDFCircle, RNSDFMaterial, RNSDFScene, RNSDFTracer} from "../RNSDF.ts";
  import {Vector2, Vector3} from "three";

  const scene = new RNSDFScene();
  const sampler = new RNSDFTracer();

  sampler.samples = 32;
  sampler.max_steps = 32;
  sampler.max_depth = 5

  const mat = new RNSDFMaterial(new Vector3(1.0,0.0,1.0), new Vector3(0.0,1.0,0.0));
  const mat2 = new RNSDFMaterial(new Vector3(1.0,1.0,1.0), new Vector3(0.0,1.0,0.0));
  const mat3 = new RNSDFMaterial(new Vector3(0.0,1.0,1.0), new Vector3(0.0,1.0,0.0));
  const mat4 = new RNSDFMaterial(new Vector3(1.0,0.0,0.0), new Vector3(0.0,1.0,0.0));

  scene.addShape(new RNSDFCircle(new Vector2(0.25, 0.0), 0.1, mat));
  scene.addShape(new RNSDFCircle(new Vector2(-0.1, 0.0), 0.03, mat2));
  scene.addShape(new RNSDFBox(new Vector2(-0.5, 0.0), new Vector2(0.1, 0.1), mat3));
  scene.addShape(new RNSDFBox(new Vector2(0.0, 0.2), new Vector2(0.1, 0.01), mat4));

  const width = ref(1000);
  const height = ref(400);

  let render_worker: Worker;

  onMounted(() => {
    render_worker = new Worker(new URL('../renderer.worker.ts', import.meta.url), {type: "module"});
    render_worker.onmessage =  (e) => {
      if (!canvas){return;}

      const { pixels, width, height, x, y } = e.data;
      const context = canvas.value?.getContext('2d');
      if (context) {
        const imgData = new ImageData(new Uint8ClampedArray(pixels), width, height);
        context.putImageData(imgData, x, y);
      }
    };
  })

  onUnmounted(() => {
    render_worker.terminate();
  })

  function render() {
    if (!canvas.value || !render_worker) return;

    const message = {
      width: width.value,
      height: height.value,
      scene: scene,
      sampler: sampler
    }

    render_worker.postMessage(message);
//    console.log("=========================== render started ================================");

//     const start_time = performance.now();
//
//     if (!canvas){return;}
//
//     const context = canvas.value?.getContext("2d");
//
//     if (!context) {return;}
//
//     const img_data = context.createImageData(width.value, height.value);
//
//     const half_width = width.value / 2.0;
//     const half_height = height.value / 2.0;
//
//     const point = new Vector2(0.0,0.0);
//
//     let byte_offset = 0;
//
//     for (let i_y = 0.0; i_y < height.value; i_y++){
//       for (let i_x = 0.0; i_x < width.value; i_x++){
//         point.x = (i_x - half_width)/width.value;
//         point.y = ((i_y - half_height)/height.value)/aspect.value;
//
//         byte_offset = (i_y * width.value + i_x) * 4;
//
//         let color = sampler.sample(scene, point);
//
//         img_data.data[byte_offset + 0] = color.x * 255;
//         img_data.data[byte_offset + 1] = color.y * 255;
//         img_data.data[byte_offset + 2] = color.z * 255;
//         img_data.data[byte_offset + 3] = 255;
//       }
//     }
// 0
//     const end_time = performance.now();
//
//     console.log(`Render time: ${end_time - start_time} ms.`);
//
//     context.putImageData( img_data, 0, 0);
  }
</script>

<template>
  <div class="card">
    <canvas ref="canvas" :width="width" :height="height"></canvas>
  </div>
  <div class="card">
    <button @click="render">render</button>
  </div>
</template>

<style scoped>
canvas {
  border: 1px solid #000000;
}
</style>