import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  
  constructor() {}

  /**
   * Solicita permisos de cámara y devuelve un stream si es concedido
   */
  async requestCameraPermission(): Promise<MediaStream> {
    try {
      // Configuración optimizada para móviles
      const constraints = {
        video: { 
          facingMode: 'environment', // Usar cámara trasera por defecto
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      // Solicitar permisos y obtener stream de cámara
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      return stream;
    } catch (error) {
      console.error('Error al solicitar permisos de cámara:', error);
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            throw new Error('Permiso denegado para acceder a la cámara. Por favor, permite el acceso.');
          case 'NotFoundError':
            throw new Error('No se encontró una cámara en tu dispositivo.');
          case 'NotReadableError':
            throw new Error('La cámara está siendo utilizada por otra aplicación.');
          case 'OverconstrainedError':
            throw new Error('Las restricciones de video no pueden ser satisfechas por la cámara.');
          case 'AbortError':
            throw new Error('La solicitud de cámara fue cancelada.');
          default:
            throw new Error(`Error al acceder a la cámara: ${error.name}`);
        }
      }
      
      throw new Error('No se pudo acceder a la cámara. Verifica que tu dispositivo tenga una cámara disponible.');
    }
  }

  /**
   * Detiene el stream de la cámara
   */
  stopCameraStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Cambia entre cámara frontal y trasera
   */
  async switchCamera(): Promise<MediaStream> {
    // Primero detenemos el stream actual
    this.stopCameraStream();
    
    // Verificamos qué cámara estamos usando actualmente
    const currentFacingMode = this.stream?.getVideoTracks()[0]?.getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    
    // Solicitamos un nuevo stream con la cámara alternativa
    try {
      const constraints = {
        video: { 
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      return stream;
    } catch (error) {
      console.error('Error al cambiar de cámara:', error);
      // Si falla el cambio, intentamos volver a la cámara original
      return this.requestCameraPermission();
    }
  }

  /**
   * Captura una imagen desde el video stream actual
   */
  capturePhoto(videoElement: HTMLVideoElement): string {
    if (!videoElement) {
      throw new Error('No hay vista previa de cámara disponible');
    }
    
    try {
      // Creamos un canvas para capturar la imagen
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Dibujamos el frame actual del video en el canvas
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No se pudo crear el contexto del canvas');
      }
      
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Convertimos el canvas a una URL de datos con buena calidad
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (error) {
      console.error('Error al capturar la foto:', error);
      throw new Error('No se pudo capturar la imagen');
    }
  }

  /**
   * Método para cargar imágenes desde la galería del dispositivo
   */
  async getPhotosFromGallery(limit: number = 10): Promise<string[]> {
    try {
      return new Promise<string[]>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        
        input.onchange = (event) => {
          const files = (event.target as HTMLInputElement).files;
          if (!files || files.length === 0) {
            resolve([]);
            return;
          }
          
          // Limitamos la cantidad de archivos a procesar
          const filesToProcess = Array.from(files).slice(0, limit);
          const imageUrls: string[] = [];
          
          let processed = 0;
          filesToProcess.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                imageUrls.push(e.target.result as string);
              }
              
              processed++;
              if (processed === filesToProcess.length) {
                resolve(imageUrls);
              }
            };
            reader.readAsDataURL(file);
          });
        };
        
        input.click();
      });
    } catch (error) {
      console.error('Error al obtener fotos:', error);
      throw new Error('No se pudieron cargar las imágenes de la galería');
    }
  }
}