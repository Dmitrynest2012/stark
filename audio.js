document.addEventListener('DOMContentLoaded', () => {
    const audio = new Audio('background_music.mp3');
    audio.loop = true;
    audio.volume = 0.3; // Громкость 30%

    // Попытка автозапуска
    const playAudio = () => {
        audio.play().then(() => {
            console.log('Музыка запущена');
        }).catch(error => {
            console.error('Ошибка автозапуска музыки:', error);
            // Запуск при первом взаимодействии
            const startAudioOnInteraction = () => {
                audio.play().then(() => {
                    console.log('Музыка запущена после взаимодействия');
                    document.removeEventListener('click', startAudioOnInteraction);
                }).catch(err => {
                    console.error('Ошибка воспроизведения после взаимодействия:', err);
                });
            };
            document.addEventListener('click', startAudioOnInteraction);
        });
    };

    try {
        playAudio();
    } catch (error) {
        console.error('Ошибка инициализации аудио:', error);
    }
});