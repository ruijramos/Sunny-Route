import { Injectable } from '@angular/core';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { Margins, TDocumentDefinitions } from 'pdfmake/interfaces';
import { WeatherInfo } from '../models/weather.interface';

(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;

@Injectable({
    providedIn: 'root'
})
export class PdfService {

    constructor() { }

    downloadRouteReport(
        startingLocation: string,
        destination: string,
        date: string,
        weatherList: { location: string, weather: WeatherInfo }[]
    ) {

        // Create body with weather info
        const docDefinitionBody: any[] = [];
        docDefinitionBody.push(['Location', 'Degree Celsius', 'Weather', 'Estimated date of arrival', 'Forecast date']);

        for (const item of weatherList) {
            docDefinitionBody.push([
                item.location,
                item.weather.temperature,
                item.weather.weatherDescription,
                item.weather.estimatedArrival,
                item.weather.forecastDate
            ]);
        }

        // Create pdfmake dd variable
        const docDefinition: TDocumentDefinitions = {
            content: [
                {
                    table: {
                        widths: ['*'],
                        body: [[{ text: "Sunny Route Report", style: 'filledHeader' }]]
                    }
                },
                { text: 'From: ' + startingLocation + '.', style: 'subheader' },
                { text: 'To: ' + destination + '.', style: 'subheader' },
                'Date: ' + date + '.',
                {
                    style: 'table',
                    table: {
                        body: docDefinitionBody
                    }
                },
                { text: 'Sunny Route is a GPS that allows you to view the weather information expected at different points along your route. You can find more information in: https://github.com/ruijramos/Sunny-Route.', style: 'littletext' }
            ],
            styles: {
                filledHeader: {
                    bold: true,
                    fontSize: 14,
                    color: 'white',
                    fillColor: '#37ACE3',
                    alignment: 'center'
                },
                header: {
                    fontSize: 30,
                    bold: true,
                    margin: [0, 0, 0, 10] as Margins
                },
                subheader: {
                    fontSize: 16,
                    bold: true,
                    margin: [0, 10, 0, 5] as Margins
                },
                littletext: {
                    fontSize: 10,
                    bold: true,
                    margin: [0, 10, 0, 5] as Margins
                },
                table: {
                    margin: [0, 5, 0, 15] as Margins
                },
                tableHeader: {
                    bold: true,
                    fontSize: 13,
                    color: 'black'
                }
            }
        };

        pdfMake.createPdf(docDefinition).download('route_weather_information.pdf');
    }
}
