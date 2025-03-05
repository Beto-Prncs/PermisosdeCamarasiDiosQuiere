import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraService } from './services/camera.service';
@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera.component.html',
  styleUrl: './camera.component.css'
})
export class CameraComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  
  // Estados de la cámara
  cameraActive: boolean = false;
  loading: boolean = false;
  errorMessage: string = '';
  
  // Imágenes y galería
  imgUrl: string = '';
  imageGallery: string[] = [];
  selectedImage: string | null = null;
  
  // Estado de permisos
  permissionGranted: boolean = false;
  
  constructor(private cameraService: CameraService) {}
  
  ngOnInit(): void {
    // Intentamos verificar si ya teníamos permiso en el pasado
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length > 0) {
          // Hay dispositivos de video disponibles, pero aún necesitamos verificar permisos
          // en la función startCamera()
        }
      })
      .catch(err => {
        console.error('Error al enumerar dispositivos:', err);
      });
  }
  
  ngAfterViewInit(): void {
    // No iniciamos la cámara automáticamente, esperamos a que el usuario inicie
  }
  
  ngOnDestroy(): void {
    // Aseguramos que se libere la cámara cuando se destruya el componente
    this.stopCamera();
  }
  
  /**
   * Inicia la cámara y muestra la vista previa
   */
  async startCamera(): Promise<void> {
    if (this.cameraActive) {
      return; // La cámara ya está activa
    }
    
    this.loading = true;
    this.errorMessage = '';
    
    try {
      // Solicitar permisos y obtener stream de la cámara
      const stream = await this.cameraService.requestCameraPermission();
      
      // Marcamos que tenemos permiso
      this.permissionGranted = true;
      
      // Conectamos el stream al elemento de video
      const videoEl = this.videoElement.nativeElement;
      videoEl.srcObject = stream;
      videoEl.setAttribute('playsinline', 'true'); // Importante para iOS
      
      // Esperamos a que el video esté listo para reproducir
      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(() => {
            this.cameraActive = true;
            resolve();
          }).catch(err => {
            console.error('Error al iniciar reproducción de video:', err);
            throw new Error('No se pudo iniciar la reproducción de video');
          });
        };
      });
      
    } catch (error) {
      console.error('Error al iniciar la cámara:', error);
      this.errorMessage = error instanceof Error ? error.message : 'Error al acceder a la cámara';
      this.cameraActive = false;
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Detiene la cámara y libera recursos
   */
  stopCamera(): void {
    if (this.videoElement?.nativeElement?.srcObject) {
      this.cameraService.stopCameraStream();
      this.videoElement.nativeElement.srcObject = null;
      this.cameraActive = false;
    }
  }
  
  /**
   * Cambia entre cámara frontal y trasera
   */
  async switchCamera(): Promise<void> {
    if (!this.cameraActive) {
      return;
    }
    
    this.loading = true;
    
    try {
      const stream = await this.cameraService.switchCamera();
      
      const videoEl = this.videoElement.nativeElement;
      videoEl.srcObject = stream;
      
      await videoEl.play();
    } catch (error) {
      console.error('Error al cambiar de cámara:', error);
      this.errorMessage = 'No se pudo cambiar de cámara';
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Captura una foto de la vista previa actual
   */
  capturePhoto(): void {
    if (!this.cameraActive || !this.videoElement) {
      this.errorMessage = 'La cámara no está activa';
      return;
    }
    
    try {
      // Capturar imagen desde el video
      this.imgUrl = this.cameraService.capturePhoto(this.videoElement.nativeElement);
      
      // Añadir la imagen capturada a la galería
      this.imageGallery.unshift(this.imgUrl);
      
      // Opcionalmente detener la cámara después de tomar la foto
      // this.stopCamera();
      
    } catch (error) {
      console.error('Error al capturar foto:', error);
      this.errorMessage = error instanceof Error ? error.message : 'Error al capturar la imagen';
    }
  }
  
  /**
   * Carga imágenes desde la galería del dispositivo
   */
  async loadFromGallery(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;
    
    try {
      const images = await this.cameraService.getPhotosFromGallery(5);
      
      if (images && images.length > 0) {
        // Añadimos las imágenes al principio de la galería
        this.imageGallery = [...images, ...this.imageGallery];
        
        // Seleccionamos la primera imagen cargada
        this.selectImage(images[0]);
        
        // Detenemos la cámara si está activa
        if (this.cameraActive) {
          this.stopCamera();
        }
      }
    } catch (error) {
      console.error('Error al cargar imágenes:', error);
      this.errorMessage = error instanceof Error ? error.message : 'Error al cargar imágenes';
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Selecciona una imagen de la galería para mostrarla en tamaño completo
   */
  selectImage(image: string): void {
    this.selectedImage = image;
    
    // Detenemos la cámara si está activa
    if (this.cameraActive) {
      this.stopCamera();
    }
  }
  
  /**
   * Elimina una imagen de la galería
   */
  deleteImage(index: number): void {
    // Verificamos si la imagen a borrar es la seleccionada
    if (this.selectedImage === this.imageGallery[index]) {
      this.selectedImage = null;
    }
    
    // Eliminamos la imagen de la galería
    this.imageGallery.splice(index, 1);
  }
  
  /**
   * Limpia todas las imágenes de la galería
   */
  clearGallery(): void {
    this.imageGallery = [];
    this.selectedImage = null;
    this.imgUrl = '';
  }
}