import { Vector2 } from "three";
import { RNSDFScene, RNSDFTracer } from "./RNSDF.ts";

self.onmessage = function(e) {
    const { width, height, scene, sampler } : {width: number, height: number, scene: RNSDFScene, sampler: RNSDFTracer} = e.data;

    const local_sampler = RNSDFTracer.reCreate(sampler);
    const local_scene = RNSDFScene.reCreate(scene);

    const aspect = width / height;

    const segmentsX = 10; // Количество сегментов по горизонтали
    const segmentsY = 10; // Количество сегментов по вертикали

    const segmentWidth = Math.ceil(width / segmentsX);
    const segmentHeight = Math.ceil(height / segmentsY);

    // Создание массива сегментов
    let segments = [];
    for (let segY = 0; segY < segmentsY; segY++) {
        for (let segX = 0; segX < segmentsX; segX++) {
            segments.push({ segX, segY });
        }
    }

    // Перемешивание массива сегментов
    for (let i = segments.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [segments[i], segments[j]] = [segments[j], segments[i]]; // обмен элементами
    }

    console.log("=========================== render started ================================");

    console.log(local_sampler);

    const start_time = performance.now();

    // Рендеринг сегментов в случайном порядке
    segments.forEach(({ segX, segY }) => {
        const startX = segX * segmentWidth;
        const startY = segY * segmentHeight;

        const pixels = new Uint8ClampedArray(segmentWidth * segmentHeight * 4);
        let byteOffset = 0;

        for (let y = 0; y < segmentHeight; y++) {
            for (let x = 0; x < segmentWidth; x++) {
                const globalX = startX + x;
                const globalY = startY + y;
                const sampling_point = new Vector2((globalX - width / 2) / width, ((globalY - height / 2) / height) / aspect);

                const color = local_sampler.sample(local_scene, sampling_point);

                pixels[byteOffset] = color.x * 255; // R
                pixels[byteOffset + 1] = color.y * 255; // G
                pixels[byteOffset + 2] = color.z * 255; // B
                pixels[byteOffset + 3] = 255; // A

                byteOffset += 4;
            }
        }

        // Отправка данных о сегменте
        self.postMessage({
            pixels,
            x: startX,
            y: startY,
            width: segmentWidth,
            height: segmentHeight
        }, [pixels.buffer]);
    });

    const end_time = performance.now();

    console.log(`Render time: ${end_time - start_time} ms.`);
};

// Render time: 7678.5999999940395 ms.