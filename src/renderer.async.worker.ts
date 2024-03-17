import { Vector2 } from "three";
import { RNSDFScene, RNSDFTracer } from "./RNSDF.ts";

async function processSegment(segment, local_sampler, local_scene, width, height, aspect) {
    const { segX, segY, segmentWidth, segmentHeight } = segment;
    // Сюда вставляется код обработки сегмента, который у тебя уже есть
    // Только теперь этот код обёрнут в функцию

    // Возвращаем Promise, который резолвится с результатами обработки сегмента
    return new Promise((resolve) => {
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

        resolve({
            pixels,
            x: startX,
            y: startY,
            width: segmentWidth,
            height: segmentHeight
        });
    });
}

self.onmessage = async function(e) {
    const { width, height, scene, sampler } : {width: number, height: number, scene: RNSDFScene, sampler: RNSDFTracer} = e.data;

    const local_sampler = RNSDFTracer.reCreate(sampler);
    const local_scene = RNSDFScene.reCreate(scene);

    const aspect = width / height;

    const segmentsX = 20; // Количество сегментов по горизонтали
    const segmentsY = 20; // Количество сегментов по вертикали

    const segmentWidth = Math.ceil(width / segmentsX);
    const segmentHeight = Math.ceil(height / segmentsY);

    // Создание массива сегментов
    let segments = [];
    for (let segY = 0; segY < segmentsY; segY++) {
        for (let segX = 0; segX < segmentsX; segX++) {
        segments.push({ segX, segY, segmentWidth, segmentHeight });
        }
    }

    // Перемешивание массива сегментов
    for (let i = segments.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [segments[i], segments[j]] = [segments[j], segments[i]]; // обмен элементами
    }

    console.log("=========================== render started ================================");

    const start_time = performance.now();

    // Рендеринг сегментов в случайном порядке
    // Асинхронная обработка всех сегментов
    const promises = segments.map(segment =>
        processSegment(segment, local_sampler, local_scene, width, height, aspect)
    );

    // Дожидаемся обработки всех сегментов
    const results = await Promise.all(promises);

    // Отправляем результаты обработки в основной поток
    results.forEach(result => {
        self.postMessage(result, [result.pixels.buffer]);
    });

    const end_time = performance.now();

    console.log(`Render time: ${end_time - start_time} ms.`);
};

// Render time: 7678.5999999940395 ms.