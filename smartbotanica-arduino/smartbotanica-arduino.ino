char request = '0';
int sensorValue;

void setup()
{
  Serial.begin(9600);
}

void loop()
{
  if (Serial.available() > 0)
  {
    request = Serial.read();
  }

  if(request != '0')
  {
     if(request == '1')
     {
       Serial.write(sensorValue);//read sensor value
     }
     else if(request == '2')
     {
        //relay code here to on water pump
        delay(3000);
        //relay code here to off water pump
     }

     request = '0';
  }  

  delay(1000);
}
