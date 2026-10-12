import { Component } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-vin-scanner',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton],
  templateUrl: './vin-scanner.html',
  styleUrl: './vin-scanner.scss',
})
export class VinScanner {}
