class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.startTime = 0;
        this.timerInterval = null;
        this.currentAudioBlob = null;
        this.audioContext = null;
        this.analyser = null;
        this.canvas = document.getElementById('visualizer');
        this.canvasCtx = this.canvas.getContext('2d');
        this.recordings = JSON.parse(localStorage.getItem('audioRecordings') || '[]');
        
        this.initElements();
        this.initEventListeners();
        this.initAudioContext();
        this.renderRecordings();
        this.updateCanvasSize();
        
        window.addEventListener('resize', () => this.updateCanvasSize());
    }
    
    initElements() {
        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.timerElement = document.getElementById('timer');
        this.statusElement = document.getElementById('status');
        this.recordingsList = document.getElementById('recordingsList');
    }
    
    initEventListeners() {
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.downloadBtn.addEventListener('click', () => this.downloadRecording());
        this.deleteBtn.addEventListener('click', () => this.deleteRecording());
    }
    
    async initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
        } catch (error) {
            console.error('无法初始化音频上下文:', error);
        }
    }
    
    updateCanvasSize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            // 设置音频可视化
            if (this.audioContext && stream) {
                const source = this.audioContext.createMediaStreamSource(stream);
                source.connect(this.analyser);
                this.visualize();
            }
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.currentAudioBlob = new Blob(this.audioChunks, { 
                    type: 'audio/webm;codecs=opus' 
                });
                
                // 停止所有音轨
                stream.getTracks().forEach(track => track.stop());
                
                this.updateUIAfterStop();
            };
            
            this.mediaRecorder.start(100); // 每100ms收集一次数据
            this.isRecording = true;
            this.startTime = Date.now();
            
            this.updateUIWhileRecording();
            this.startTimer();
            
        } catch (error) {
            console.error('无法访问麦克风:', error);
            alert('无法访问麦克风。请确保已授予麦克风权限。');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopTimer();
        }
    }
    
    updateUIWhileRecording() {
        this.recordBtn.disabled = true;
        this.recordBtn.classList.add('recording');
        this.recordBtn.innerHTML = '<span class="icon">●</span> 录制中...';
        
        this.stopBtn.disabled = false;
        this.downloadBtn.disabled = true;
        this.deleteBtn.disabled = true;
        
        this.statusElement.textContent = '正在录制...';
        this.statusElement.className = 'status recording';
    }
    
    updateUIAfterStop() {
        this.recordBtn.disabled = false;
        this.recordBtn.classList.remove('recording');
        this.recordBtn.innerHTML = '<span class="icon">●</span> 开始录制';
        
        this.stopBtn.disabled = true;
        this.downloadBtn.disabled = false;
        this.deleteBtn.disabled = false;
        
        this.statusElement.textContent = '录制完成，可以保存或删除';
        this.statusElement.className = 'status stopped';
    }
    
    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            this.updateTimer(elapsed);
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateTimer(elapsedMs) {
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        this.timerElement.textContent = 
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`;
    }
    
    visualize() {
        if (!this.analyser || !this.isRecording) return;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            if (!this.isRecording) return;
            
            requestAnimationFrame(draw);
            this.analyser.getByteFrequencyData(dataArray);
            
            this.canvasCtx.fillStyle = 'rgb(248, 249, 250)';
            this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            const barWidth = (this.canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                
                const gradient = this.canvasCtx.createLinearGradient(0, 0, 0, this.canvas.height);
                gradient.addColorStop(0, '#ff4757');
                gradient.addColorStop(0.5, '#ff6b81');
                gradient.addColorStop(1, '#ff3838');
                
                this.canvasCtx.fillStyle = gradient;
                this.canvasCtx.fillRect(
                    x, 
                    this.canvas.height - barHeight, 
                    barWidth, 
                    barHeight
                );
                
                x += barWidth + 1;
            }
        };
        
        draw();
    }
    
    downloadRecording() {
        if (!this.currentAudioBlob) return;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `recording-${timestamp}.webm`;
        
        // 转换为MP3格式（使用WebM格式，现代浏览器都支持）
        const url = URL.createObjectURL(this.currentAudioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 保存到本地存储
        this.saveToLocalStorage(filename);
    }
    
    saveToLocalStorage(filename) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const recording = {
                id: Date.now().toString(),
                name: filename,
                data: reader.result,
                date: new Date().toLocaleString(),
                duration: this.timerElement.textContent,
                size: this.currentAudioBlob.size
            };
            
            this.recordings.unshift(recording);
            localStorage.setItem('audioRecordings', JSON.stringify(this.recordings));
            this.renderRecordings();
            
            alert(`录音已保存: ${filename}`);
        };
        reader.readAsDataURL(this.currentAudioBlob);
    }
    
    deleteRecording() {
        if (!this.currentAudioBlob) return;
        
        if (confirm('确定要删除当前录音吗？')) {
            this.currentAudioBlob = null;
            this.audioChunks = [];
            this.timerElement.textContent = '00:00:00';
            this.statusElement.textContent = '准备开始录制';
            this.statusElement.className = 'status';
            
            this.downloadBtn.disabled = true;
            this.deleteBtn.disabled = true;
            
            // 清除可视化
            this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    renderRecordings() {
        if (this.recordings.length === 0) {
            this.recordingsList.innerHTML = '<div class="empty-list">暂无录音文件</div>';
            return;
        }
        
        this.recordingsList.innerHTML = this.recordings.map(recording => `
            <div class="recording-item" data-id="${recording.id}">
                <div class="recording-info">
                    <div class="recording-name">${recording.name}</div>
                    <div class="recording-details">
                        时长: ${recording.duration} | 
                        大小: ${this.formatFileSize(recording.size)} | 
                        日期: ${recording.date}
                    </div>
                </div>
                <div class="recording-actions">
                    <button class="action-btn play-btn" onclick="audioRecorder.playRecording('${recording.id}')">
                        <span class="icon">▶</span> 播放
                    </button>
                    <button class="action-btn download-btn" onclick="audioRecorder.downloadFromStorage('${recording.id}')">
                        <span class="icon">↓</span> 下载
                    </button>
                    <button class="action-btn delete-btn" onclick="audioRecorder.deleteFromStorage('${recording.id}')">
                        <span class="icon">🗑️</span> 删除
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    playRecording(id) {
        const recording = this.recordings.find(r => r.id === id);
        if (!recording) return;
        
        const audio = new Audio(recording.data);
        const playBtn = document.querySelector(`.recording-item[data-id="${id}"] .play-btn`);
        
        playBtn.classList.add('playing');
        playBtn.innerHTML = '<span class="icon">⏸</span> 暂停';
        
        audio.play();
        
        audio.onended = () => {
            playBtn.classList.remove('playing');
            playBtn.innerHTML = '<span class="icon">▶</span> 播放';
        };
        
        audio.onpause = () => {
            playBtn.classList.remove('playing');
            playBtn.innerHTML = '<span class="icon">▶</span> 播放';
        };
        
        // 点击暂停
        playBtn.onclick = () => {
            if (!audio.paused) {
                audio.pause();
            } else {
                audio.play();
                playBtn.classList.add('playing');
                playBtn.innerHTML = '<span class="icon">⏸</span> 暂停';
            }
        };
    }
    
    downloadFromStorage(id) {
        const recording = this.recordings.find(r => r.id === id);
        if (!recording) return;
        
        const a = document.createElement('a');
        a.href = recording.data;
        a.download = recording.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    deleteFromStorage(id) {
        if (confirm('确定要删除这个录音文件吗？')) {
            this.recordings = this.recordings.filter(r => r.id !== id);
            localStorage.setItem('audioRecordings', JSON.stringify(this.recordings));
            this.renderRecordings();
        }
    }
    
    clearAllRecordings() {
        if (confirm('确定要删除所有录音文件吗？此操作不可撤销。')) {
            this.recordings = [];
            localStorage.removeItem('audioRecordings');
            this.renderRecordings();
        }
    }
}

// 初始化录音器
let audioRecorder;

document.addEventListener('DOMContentLoaded', () => {
    audioRecorder = new AudioRecorder();
    
    // 添加清除所有录音的按钮（可选功能）
    const clearAllBtn = document.createElement('button');
    clearAllBtn.textContent = '🗑️ 清除所有录音';
    clearAllBtn.className = 'action-btn delete-btn';
    clearAllBtn.style.marginTop = '10px';
    clearAllBtn.onclick = () => audioRecorder.clearAllRecordings();
    
    document.querySelector('.recordings-section').appendChild(clearAllBtn);
    
    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.target.matches('button, input, textarea')) {
            e.preventDefault();
            if (audioRecorder.isRecording) {
                audioRecorder.stopRecording();
            } else {
                audioRecorder.startRecording();
            }
        }
        
        if (e.code === 'Escape' && audioRecorder.isRecording) {
            audioRecorder.stopRecording();
        }
    });
});
