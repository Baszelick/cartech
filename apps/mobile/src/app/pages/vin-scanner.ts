import {Component, signal} from '@angular/core';
import {IonButton, IonContent, IonHeader, IonTitle, IonToolbar} from '@ionic/angular';
import {Camera, CameraResultType, CameraSource} from '@capacitor/camera';
import {CapacitorPluginMlKitTextRecognition} from '@pantrist/capacitor-plugin-ml-kit-text-recognition';

@Component({
  selector: 'app-vin-scanner',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton],
  templateUrl: './vin-scanner.html',
  styleUrl: './vin-scanner.scss',
})
export class VinScanner {
  readonly photoUrl = signal<string | null>(null)
  readonly vin = signal<string>('');

  private extractVin(text: string): string | null {
    const normalizedText = text.toUpperCase().replace(/\s+/g, '');

    return normalizedText.match(/(?:XTT|LVA)[A-HJ-NPR-Z0-9]{14}/)?.[0] ?? null;
  }

  async takePhoto() {
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.Base64,
      quality: 90,
    });

    if (!photo.base64String) return;

    this.photoUrl.set(`data:image/${photo.format};base64,${photo.base64String}`);

    const result = await CapacitorPluginMlKitTextRecognition.detectText({
      base64Image: photo.base64String,
      rotation: 0,
    });



    this.vin.set(this.extractVin(result.text) ?? 'Нет вин');
  }
}
